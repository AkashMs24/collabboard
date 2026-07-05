const pool = require('../config/db');
const { callGroq } = require('../utils/groq');

const BOUNCE_THRESHOLD = 2;

const createTask = async (req, res, next) => {
  try {
    const { columnId, boardId } = req.params;
    const { title, description, priority, tag, due_date, assignee_id, idempotency_key } = req.body;

    if (!title) return res.status(400).json({ error: 'Task title is required' });

    if (idempotency_key) {
      const existing = await pool.query('SELECT * FROM tasks WHERE idempotency_key = $1', [idempotency_key]);
      if (existing.rows[0]) return res.status(200).json({ task: existing.rows[0], cached: true });
    }

    const posResult = await pool.query(
      'SELECT COALESCE(MAX(position), -1) + 1 as next_pos FROM tasks WHERE column_id = $1',
      [columnId]
    );

    const result = await pool.query(
      `INSERT INTO tasks (column_id, board_id, title, description, priority, tag, position,
         due_date, assignee_id, created_by, idempotency_key)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [columnId, boardId, title.trim(), description, priority || 'medium', tag,
       posResult.rows[0].next_pos, due_date, assignee_id, req.user.id, idempotency_key]
    );

    await pool.query(
      `INSERT INTO activity_log (board_id, user_id, action, entity_type, entity_id, meta)
       VALUES ($1, $2, 'created task', 'task', $3, $4)`,
      [boardId, req.user.id, result.rows[0].id, JSON.stringify({ title: title.trim(), column_id: columnId })]
    );

    res.status(201).json({ task: result.rows[0] });
  } catch (err) { next(err); }
};

const updateTask = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const { title, description, priority, tag, due_date, assignee_id, is_completed } = req.body;

    const result = await pool.query(
      `UPDATE tasks SET
         title = COALESCE($1, title),
         description = COALESCE($2, description),
         priority = COALESCE($3, priority),
         tag = COALESCE($4, tag),
         due_date = COALESCE($5, due_date),
         assignee_id = COALESCE($6, assignee_id),
         is_completed = COALESCE($7, is_completed),
         updated_at = NOW()
       WHERE id = $8 RETURNING *`,
      [title, description, priority, tag, due_date, assignee_id, is_completed, taskId]
    );

    if (!result.rows[0]) return res.status(404).json({ error: 'Task not found' });

    if (title) {
      await pool.query(
        `INSERT INTO activity_log (board_id, user_id, action, entity_type, entity_id, meta)
         VALUES ($1, $2, 'updated task', 'task', $3, $4)`,
        [result.rows[0].board_id, req.user.id, taskId, JSON.stringify({ title })]
      );
    }

    res.json({ task: result.rows[0] });
  } catch (err) { next(err); }
};

const generateBounceRetro = async (taskId, boardId, title, bounceCount) => {
  if (!process.env.GROQ_API_KEY) return;
  try {
    const prompt = `A task titled "${title}" has bounced backward between Kanban columns ${bounceCount} times — meaning it was marked done/reviewed and then sent back repeatedly. In 2 sentences: name the most likely root cause category (unclear requirements, insufficient testing, scope creep, or dependency blocked) and one concrete process fix. No preamble.`;
    const note = await callGroq(prompt, 120);
    await pool.query(
      `UPDATE task_bounces SET ai_retro_note = $1
       WHERE id = (SELECT id FROM task_bounces WHERE task_id = $2 ORDER BY created_at DESC LIMIT 1)`,
      [note, taskId]
    );
  } catch {
    // best-effort — never let AI failure affect the move operation
  }
};

const moveTask = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const { column_id, position, board_id } = req.body;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const taskResult = await client.query('SELECT * FROM tasks WHERE id = $1 FOR UPDATE', [taskId]);
      const task = taskResult.rows[0];
      if (!task) throw Object.assign(new Error('Task not found'), { status: 404 });

      const fromColumnId = task.column_id;

      await client.query(
        'UPDATE tasks SET position = position + 1 WHERE column_id = $1 AND position >= $2 AND id != $3',
        [column_id, position, taskId]
      );

      const result = await client.query(
        `UPDATE tasks SET column_id = $1, position = $2, updated_at = NOW()
         WHERE id = $3 RETURNING *`,
        [column_id, position, taskId]
      );

      await client.query(
        `INSERT INTO activity_log (board_id, user_id, action, entity_type, entity_id, meta)
         VALUES ($1, $2, 'moved task', 'task', $3, $4)`,
        [board_id, req.user.id, taskId, JSON.stringify({ column_id })]
      );

      let bounced = false;
      let newBounceCount = task.bounce_count || 0;

      if (fromColumnId && fromColumnId !== column_id) {
        const positions = await client.query(
          'SELECT id, position FROM columns WHERE id = ANY($1::uuid[])',
          [[fromColumnId, column_id]]
        );
        const posMap = Object.fromEntries(positions.rows.map((c) => [c.id, c.position]));

        if (posMap[column_id] < posMap[fromColumnId]) {
          bounced = true;
          newBounceCount += 1;

          await client.query('UPDATE tasks SET bounce_count = $1 WHERE id = $2', [newBounceCount, taskId]);
          await client.query(
            `INSERT INTO task_bounces (task_id, board_id, from_column_id, to_column_id, user_id)
             VALUES ($1, $2, $3, $4, $5)`,
            [taskId, board_id, fromColumnId, column_id, req.user.id]
          );
          await client.query(
            `INSERT INTO activity_log (board_id, user_id, action, entity_type, entity_id, meta)
             VALUES ($1, $2, 'task bounced', 'task', $3, $4)`,
            [board_id, req.user.id, taskId, JSON.stringify({ from: fromColumnId, to: column_id, bounce_count: newBounceCount })]
          );
        }
      }

      await client.query('COMMIT');
      res.json({ task: { ...result.rows[0], bounce_count: newBounceCount }, bounced, bounce_count: newBounceCount });

      if (bounced && newBounceCount >= BOUNCE_THRESHOLD) {
        generateBounceRetro(taskId, board_id, result.rows[0].title, newBounceCount);
      }
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) { next(err); }
};

const deleteTask = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const task = await pool.query('SELECT board_id, title FROM tasks WHERE id = $1', [taskId]);
    if (!task.rows[0]) return res.status(404).json({ error: 'Task not found' });

    await pool.query('DELETE FROM tasks WHERE id = $1', [taskId]);
    await pool.query(
      `INSERT INTO activity_log (board_id, user_id, action, entity_type, entity_id, meta)
       VALUES ($1, $2, 'deleted task', 'task', $3, $4)`,
      [task.rows[0].board_id, req.user.id, taskId, JSON.stringify({ title: task.rows[0].title })]
    );
    res.json({ message: 'Task deleted' });
  } catch (err) { next(err); }
};

const addComment = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: 'Comment content required' });

    const result = await pool.query(
      `INSERT INTO task_comments (task_id, user_id, content)
       VALUES ($1, $2, $3) RETURNING *`,
      [taskId, req.user.id, content.trim()]
    );
    res.status(201).json({ comment: result.rows[0] });
  } catch (err) { next(err); }
};

const getComments = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const result = await pool.query(
      `SELECT tc.*, u.name, u.avatar_color FROM task_comments tc
       JOIN users u ON u.id = tc.user_id
       WHERE tc.task_id = $1 ORDER BY tc.created_at`,
      [taskId]
    );
    res.json({ comments: result.rows });
  } catch (err) { next(err); }
};

module.exports = { createTask, updateTask, moveTask, deleteTask, addComment, getComments };
