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

// ─── GROQ HELPER ─────────────────────────────────────────────────────────────
const callGroq = async (prompt, maxTokens = 1000) => {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Groq error: ${err}`);
  }
  const data = await response.json();
  return data.choices[0].message.content.trim();
};

// ─── ADMIN ───────────────────────────────────────────────────────────────────
const ADMIN_EMAIL = 'manigarakash@gmail.com';

// FIX: JWT token only contains userId — look up email from DB
const adminOnly = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) return res.status(403).json({ error: 'Forbidden' });
    const token = authHeader.split(' ')[1];
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const result = await pool.query(
      'SELECT id, name, email, avatar_color FROM users WHERE id = $1',
      [decoded.userId]
    );
    if (!result.rows[0] || result.rows[0].email !== ADMIN_EMAIL) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    req.user = result.rows[0];
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

// Search tasks across all boards in a workspace
router.get('/api/workspaces/:workspaceId/search', authenticate, async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 2) return res.json({ tasks: [] });
    const result = await pool.query(
      `SELECT t.id, t.title, t.priority, t.tag, t.column_id, t.board_id,
              b.name as board_name, c.name as column_name
       FROM tasks t
       JOIN boards b ON b.id = t.board_id
       JOIN columns c ON c.id = t.column_id
       JOIN workspace_members wm ON wm.workspace_id = b.workspace_id AND wm.user_id = $1
       WHERE b.workspace_id = $2
         AND b.is_archived = false
         AND (t.title ILIKE $3 OR t.tag ILIKE $3)
       ORDER BY t.created_at DESC
       LIMIT 20`,
      [req.user.id, req.params.workspaceId, `%${q.trim()}%`]
    );
    res.json({ tasks: result.rows });
  } catch (err) { next(err); }
});

// ─── AI ROUTES ───────────────────────────────────────────────────────────────

// AI: Generate full task breakdown for a board
router.post('/api/ai/generate-tasks', authenticate, async (req, res, next) => {
  try {
    const { boardName, boardDescription, existingColumns } = req.body;
    if (!boardName) return res.status(400).json({ error: 'Board name required' });

    const cols = (existingColumns || ['Backlog', 'In Progress', 'Review', 'Done']).join(', ');
    const prompt = `You are a senior software project manager. A team just created a new project board named "${boardName}"${boardDescription ? ` described as: "${boardDescription}"` : ''}.

Generate realistic, specific, actionable tasks organized into these columns: ${cols}.

Return ONLY a valid JSON object with no markdown, no code fences, no explanation:
{"columns":{"Backlog":["task 1","task 2","task 3"],"In Progress":["task 4","task 5"],"Review":["task 6"],"Done":["task 7"]},"summary":"One sentence summary of what this project is."}

Rules:
- Each task should be a real engineering task (specific, not generic)
- 3-5 tasks per column
- Use the exact column names I provided
- No markdown in task names`;

    const text = await callGroq(prompt, 1000);
    const clean = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);
    res.json(parsed);
  } catch (err) { next(err); }
});

// AI: Write task description with acceptance criteria
router.post('/api/ai/task-description', authenticate, async (req, res, next) => {
  try {
    const { taskTitle, boardName } = req.body;
    if (!taskTitle) return res.status(400).json({ error: 'taskTitle required' });

    const prompt = `Write a concise professional task description for: "${taskTitle}" in project "${boardName || 'a software project'}".

Format exactly like this:
**What:** One sentence of what needs to be built.
**Acceptance Criteria:**
- Criterion 1
- Criterion 2
- Criterion 3
**Complexity:** Low / Medium / High

Keep it under 80 words total. Be specific and technical.`;

    const description = await callGroq(prompt, 250);
    res.json({ description });
  } catch (err) { next(err); }
});

// AI: Daily standup report from board activity
router.post('/api/ai/standup', authenticate, async (req, res, next) => {
  try {
    const { boardId } = req.body;
    if (!boardId) return res.status(400).json({ error: 'boardId required' });

    const [activityRes, boardRes] = await Promise.all([
      pool.query(
        `SELECT al.action, u.name, al.created_at, al.meta
         FROM activity_log al
         LEFT JOIN users u ON u.id = al.user_id
         WHERE al.board_id = $1 AND al.created_at > NOW() - INTERVAL '24 hours'
         ORDER BY al.created_at DESC LIMIT 30`,
        [boardId]
      ),
      pool.query('SELECT name FROM boards WHERE id = $1', [boardId]),
    ]);

    const boardName = boardRes.rows[0]?.name || 'this board';
    const activities = activityRes.rows;
    if (activities.length === 0) {
      return res.json({ standup: `No activity recorded on "${boardName}" in the last 24 hours.` });
    }

    const activityText = activities.map(a => {
      const meta = a.meta || {};
      return `${a.name} ${a.action}${meta.title ? ` "${meta.title}"` : ''} at ${new Date(a.created_at).toLocaleTimeString()}`;
    }).join('\n');

    const prompt = `Generate a concise daily standup report for board "${boardName}" based on this 24h activity:\n\n${activityText}\n\nFormat:\n✅ Completed:\n🔄 In Progress:\n⚠️ Blockers:\n\nUnder 100 words. Professional tone. Infer blockers if tasks seem stuck.`;

    const standup = await callGroq(prompt, 300);
    res.json({ standup });
  } catch (err) { next(err); }
});

// AI: Suggest priority for a task based on its title
router.post('/api/ai/suggest-priority', authenticate, async (req, res, next) => {
  try {
    const { taskTitle } = req.body;
    if (!taskTitle) return res.status(400).json({ error: 'taskTitle required' });

    const prompt = `Given this software task title: "${taskTitle}"
    
Respond with ONLY one word — either: high, medium, or low
Base it on urgency and impact implied by the title. No explanation.`;

    const result = await callGroq(prompt, 10);
    const priority = ['high', 'medium', 'low'].find(p => result.toLowerCase().includes(p)) || 'medium';
    res.json({ priority });
  } catch (err) { next(err); }
});

// ─── END AI ROUTES ────────────────────────────────────────────────────────────

module.exports = router;
