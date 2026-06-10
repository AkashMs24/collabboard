const express = require('express');
const rateLimit = require('express-rate-limit');
const { authenticate } = require('../middleware/auth');
const authCtrl = require('../controllers/authController');
const boardCtrl = require('../controllers/boardController');
const taskCtrl = require('../controllers/taskController');
const pool = require('../config/db');
const router = express.Router();

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: { error: 'Too many attempts' } });
const apiLimiter = rateLimit({ windowMs: 60 * 1000, max: 100, message: { error: 'Rate limit exceeded' } });
router.use('/api', apiLimiter);

// ─── ADMIN ───────────────────────────────────────────────────────────────────
const ADMIN_EMAIL = 'manigarakash@gmail.com';

const adminOnly = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(403).json({ error: 'Forbidden' });
    const token = authHeader.split(' ')[1];
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.email !== ADMIN_EMAIL) return res.status(403).json({ error: 'Forbidden' });
    req.user = decoded;
    next();
  } catch {
    res.status(403).json({ error: 'Forbidden' });
  }
};

router.get('/api/admin/users', adminOnly, async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT
        u.id, u.name, u.email, u.avatar_color, u.created_at,
        (SELECT COUNT(*) FROM workspace_members wm WHERE wm.user_id = u.id) as workspace_count,
        (SELECT MAX(rt.created_at) FROM refresh_tokens rt WHERE rt.user_id = u.id) as last_login
      FROM users u
      ORDER BY u.created_at DESC
    `);
    res.json({ users: result.rows });
  } catch (err) { next(err); }
});

router.get('/api/admin/stats', adminOnly, async (req, res, next) => {
  try {
    const [users, workspaces, boards, tasks, today] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM users'),
      pool.query('SELECT COUNT(*) FROM workspaces'),
      pool.query('SELECT COUNT(*) FROM boards'),
      pool.query('SELECT COUNT(*) FROM tasks'),
      pool.query("SELECT COUNT(*) FROM users WHERE created_at > NOW() - INTERVAL '24 hours'"),
    ]);
    res.json({
      total_users: parseInt(users.rows[0].count),
      total_workspaces: parseInt(workspaces.rows[0].count),
      total_boards: parseInt(boards.rows[0].count),
      total_tasks: parseInt(tasks.rows[0].count),
      new_today: parseInt(today.rows[0].count),
    });
  } catch (err) { next(err); }
});
// ─── END ADMIN ────────────────────────────────────────────────────────────────

// Health
router.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'connected', timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: 'error', db: 'disconnected' });
  }
});

// Auth
router.post('/api/auth/register', authLimiter, authCtrl.register);
router.post('/api/auth/login', authLimiter, authCtrl.login);
router.post('/api/auth/refresh', authCtrl.refresh);
router.post('/api/auth/logout', authenticate, authCtrl.logout);
router.get('/api/auth/me', authenticate, authCtrl.me);

// Workspace
router.get('/api/workspaces', authenticate, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT w.*, wm.role as my_role,
        (SELECT COUNT(*) FROM boards b WHERE b.workspace_id = w.id) as board_count
       FROM workspaces w
       JOIN workspace_members wm ON wm.workspace_id = w.id AND wm.user_id = $1
       ORDER BY w.created_at DESC`,
      [req.user.id]
    );
    res.json({ workspaces: result.rows });
  } catch (err) { next(err); }
});

router.post('/api/workspaces', authenticate, async (req, res, next) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: 'Workspace name required' });
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const ws = await client.query(
        'INSERT INTO workspaces (name, description, owner_id) VALUES ($1, $2, $3) RETURNING *',
        [name.trim(), description, req.user.id]
      );
      await client.query(
        'INSERT INTO workspace_members (workspace_id, user_id, role) VALUES ($1, $2, $3)',
        [ws.rows[0].id, req.user.id, 'admin']
      );
      await client.query('COMMIT');
      res.status(201).json({ workspace: ws.rows[0] });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) { next(err); }
});

// Boards
router.get('/api/workspaces/:workspaceId/boards', authenticate, boardCtrl.getBoards);
router.post('/api/workspaces/:workspaceId/boards', authenticate, boardCtrl.createBoard);
router.get('/api/boards/:boardId', authenticate, boardCtrl.getBoard);
router.patch('/api/boards/:boardId', authenticate, boardCtrl.updateBoard);
router.delete('/api/boards/:boardId', authenticate, boardCtrl.deleteBoard);

// Activity
router.get('/api/boards/:boardId/activity', authenticate, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT al.*, u.name, u.avatar_color FROM activity_log al
       LEFT JOIN users u ON u.id = al.user_id
       WHERE al.board_id = $1 ORDER BY al.created_at DESC LIMIT 50`,
      [req.params.boardId]
    );
    res.json({ activity: result.rows });
  } catch (err) { next(err); }
});

// Tasks
router.post('/api/boards/:boardId/columns/:columnId/tasks', authenticate, taskCtrl.createTask);
router.patch('/api/tasks/:taskId', authenticate, taskCtrl.updateTask);
router.patch('/api/tasks/:taskId/move', authenticate, taskCtrl.moveTask);
router.delete('/api/tasks/:taskId', authenticate, taskCtrl.deleteTask);
router.get('/api/tasks/:taskId/comments', authenticate, taskCtrl.getComments);
router.post('/api/tasks/:taskId/comments', authenticate, taskCtrl.addComment);

module.exports = router;
