const pool = require('../config/db');

const getBoards = async (req, res, next) => {
  try {
    const { workspaceId } = req.params;
    const result = await pool.query(
      `SELECT b.*, u.name as creator_name,
        (SELECT COUNT(*) FROM tasks t WHERE t.board_id = b.id AND NOT t.is_completed) as open_tasks
       FROM boards b
       LEFT JOIN users u ON u.id = b.created_by
       WHERE b.workspace_id = $1 AND NOT b.is_archived
       ORDER BY b.created_at DESC`,
      [workspaceId]
    );
    res.json({ boards: result.rows });
  } catch (err) { next(err); }
};

const getBoard = async (req, res, next) => {
  try {
    const { boardId } = req.params;

    const boardResult = await pool.query(
      `SELECT b.*, u.name as creator_name FROM boards b
       LEFT JOIN users u ON u.id = b.created_by WHERE b.id = $1`,
      [boardId]
    );
    if (!boardResult.rows[0]) return res.status(404).json({ error: 'Board not found' });

    const columnsResult = await pool.query(
      'SELECT * FROM columns WHERE board_id = $1 ORDER BY position',
      [boardId]
    );

    const tasksResult = await pool.query(
      `SELECT t.*, u.name as assignee_name, u.avatar_color as assignee_color,
        (SELECT COUNT(*) FROM task_comments tc WHERE tc.task_id = t.id) as comment_count
       FROM tasks t
       LEFT JOIN users u ON u.id = t.assignee_id
       WHERE t.board_id = $1
       ORDER BY t.position`,
      [boardId]
    );

    const columns = columnsResult.rows.map(col => ({
      ...col,
      tasks: tasksResult.rows.filter(t => t.column_id === col.id),
    }));

    res.json({ board: boardResult.rows[0], columns });
  } catch (err) { next(err); }
};

const createBoard = async (req, res, next) => {
  try {
    const { workspaceId } = req.params;
    const { name, description, color } = req.body;
    if (!name) return res.status(400).json({ error: 'Board name is required' });

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const boardResult = await client.query(
        `INSERT INTO boards (workspace_id, name, description, color, created_by)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [workspaceId, name.trim(), description, color || '#6B5CFF', req.user.id]
      );
      const board = boardResult.rows[0];

      const defaultColumns = ['Backlog', 'In Progress', 'Review', 'Done'];
      const colColors = ['#55556A', '#3B82F6', '#6B5CFF', '#22C97E'];
      for (let i = 0; i < defaultColumns.length; i++) {
        await client.query(
          'INSERT INTO columns (board_id, name, position, color) VALUES ($1, $2, $3, $4)',
          [board.id, defaultColumns[i], i, colColors[i]]
        );
      }

      await client.query('COMMIT');
      res.status(201).json({ board });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) { next(err); }
};

const updateBoard = async (req, res, next) => {
  try {
    const { boardId } = req.params;
    const { name, description, color } = req.body;
    const result = await pool.query(
      `UPDATE boards SET name = COALESCE($1, name), description = COALESCE($2, description),
       color = COALESCE($3, color) WHERE id = $4 RETURNING *`,
      [name, description, color, boardId]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Board not found' });
    res.json({ board: result.rows[0] });
  } catch (err) { next(err); }
};

const deleteBoard = async (req, res, next) => {
  try {
    const { boardId } = req.params;
    await pool.query('UPDATE boards SET is_archived = true WHERE id = $1', [boardId]);
    res.json({ message: 'Board archived' });
  } catch (err) { next(err); }
};

module.exports = { getBoards, getBoard, createBoard, updateBoard, deleteBoard };
