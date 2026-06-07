const pool = require('../config/db');

const createTask = async (req, res, next) => {
  try {
    const { columnId, boardId } = req.params;
    const { title, description, priority, tag, due_date, assignee_id, idempotency_key } = req.body;

    if (!title) return res.status(400).json({ error: 'Task title is required' });

    // Idempotency: return existing task if key already used
    if (idempotency_key) {
      const existing = await pool.query(
        'SELECT * FROM tasks WHERE idempotency_key = $1', [idempotency_key]
      );
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
      [boardId, req.user.id, result.rows[0].id, JSON.stringify({ title })]
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
    res.json({ task: result.rows[0] });
  } catch (err) { next(err); }
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

      // Shift positions in destination column
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

      await client.query('COMMIT');
      res.json({ task: result.rows[0] });
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
    await pool.query('DELETE FROM tasks WHERE id = $1', [taskId]);
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
