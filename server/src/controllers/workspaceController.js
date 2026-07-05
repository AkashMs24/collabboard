const pool = require('../config/db');

const inviteMember = async (req, res, next) => {
  try {
    const { workspaceId } = req.params;
    const { email, role } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });

    const requester = await pool.query(
      'SELECT role FROM workspace_members WHERE workspace_id = $1 AND user_id = $2',
      [workspaceId, req.user.id]
    );
    if (requester.rows[0]?.role !== 'admin') {
      return res.status(403).json({ error: 'Only workspace admins can invite members' });
    }

    const userRes = await pool.query('SELECT id, name, email FROM users WHERE email = $1', [email.toLowerCase()]);
    if (!userRes.rows[0]) {
      return res.status(404).json({ error: 'No user with that email. They need to register first.' });
    }

    const existing = await pool.query(
      'SELECT 1 FROM workspace_members WHERE workspace_id = $1 AND user_id = $2',
      [workspaceId, userRes.rows[0].id]
    );
    if (existing.rows[0]) return res.status(409).json({ error: 'User is already a member' });

    await pool.query(
      'INSERT INTO workspace_members (workspace_id, user_id, role) VALUES ($1, $2, $3)',
      [workspaceId, userRes.rows[0].id, role === 'admin' ? 'admin' : 'member']
    );

    res.status(201).json({ message: `${userRes.rows[0].name} added to workspace`, member: userRes.rows[0] });
  } catch (err) { next(err); }
};

const listMembers = async (req, res, next) => {
  try {
    const { workspaceId } = req.params;
    const result = await pool.query(
      `SELECT u.id, u.name, u.email, u.avatar_color, u.is_online, wm.role, wm.joined_at
       FROM workspace_members wm JOIN users u ON u.id = wm.user_id
       WHERE wm.workspace_id = $1 ORDER BY wm.joined_at`,
      [workspaceId]
    );
    res.json({ members: result.rows });
  } catch (err) { next(err); }
};

const updateMemberRole = async (req, res, next) => {
  try {
    const { workspaceId, userId } = req.params;
    const { role } = req.body;
    if (!['admin', 'member'].includes(role)) return res.status(400).json({ error: 'Invalid role' });

    const requester = await pool.query(
      'SELECT role FROM workspace_members WHERE workspace_id = $1 AND user_id = $2',
      [workspaceId, req.user.id]
    );
    if (requester.rows[0]?.role !== 'admin') return res.status(403).json({ error: 'Admin only' });

    await pool.query(
      'UPDATE workspace_members SET role = $1 WHERE workspace_id = $2 AND user_id = $3',
      [role, workspaceId, userId]
    );
    res.json({ message: 'Role updated' });
  } catch (err) { next(err); }
};

const removeMember = async (req, res, next) => {
  try {
    const { workspaceId, userId } = req.params;
    const requester = await pool.query(
      'SELECT role FROM workspace_members WHERE workspace_id = $1 AND user_id = $2',
      [workspaceId, req.user.id]
    );
    if (requester.rows[0]?.role !== 'admin' && req.user.id !== userId) {
      return res.status(403).json({ error: 'Admin only, or remove yourself' });
    }
    await pool.query('DELETE FROM workspace_members WHERE workspace_id = $1 AND user_id = $2', [workspaceId, userId]);
    res.json({ message: 'Member removed' });
  } catch (err) { next(err); }
};

module.exports = { inviteMember, listMembers, updateMemberRole, removeMember };
