const pool = require('../config/db');

const resolveBoardId = async (req) => {
  if (req.params.boardId) return req.params.boardId;
  if (req.body.board_id) return req.body.board_id;

  if (req.params.taskId) {
    const r = await pool.query('SELECT board_id FROM tasks WHERE id = $1', [req.params.taskId]);
    return r.rows[0]?.board_id || null;
  }
  if (req.params.columnId) {
    const r = await pool.query('SELECT board_id FROM columns WHERE id = $1', [req.params.columnId]);
    return r.rows[0]?.board_id || null;
  }
  return null;
};

const requireBoardAccess = (minRole = 'member') => async (req, res, next) => {
  try {
    const boardId = await resolveBoardId(req);
    if (!boardId) return res.status(400).json({ error: 'Could not resolve board' });

    const result = await pool.query(
      `SELECT wm.role FROM boards b
       JOIN workspace_members wm ON wm.workspace_id = b.workspace_id
       WHERE b.id = $1 AND wm.user_id = $2`,
      [boardId, req.user.id]
    );

    const membership = result.rows[0];
    if (!membership) return res.status(403).json({ error: "Not a member of this board's workspace" });

    if (minRole === 'admin' && membership.role !== 'admin') {
      return res.status(403).json({ error: 'Requires admin role in workspace' });
    }

    req.boardId = boardId;
    req.workspaceRole = membership.role;
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { requireBoardAccess };
