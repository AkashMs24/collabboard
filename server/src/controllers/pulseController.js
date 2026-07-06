const pool = require('../config/db');

const getWorkspacePulse = async (req, res, next) => {
  try {
    const { workspaceId } = req.params;

    const membership = await pool.query(
      'SELECT 1 FROM workspace_members WHERE workspace_id = $1 AND user_id = $2',
      [workspaceId, req.user.id]
    );
    if (!membership.rows[0]) return res.status(403).json({ error: 'Not a member of this workspace' });

    const boardIdsRes = await pool.query('SELECT id FROM boards WHERE workspace_id = $1', [workspaceId]);
    const boardIds = boardIdsRes.rows.map((b) => b.id);

    if (boardIds.length === 0) {
      return res.json({
        online_count: 0, total_tasks: 0, overdue_count: 0, stale_count: 0,
        total_bounces: 0, health_score: 100, streak_days: 0, leaderboard: [],
      });
    }

    const now = new Date();

    const [tasksRes, onlineRes, bouncesRes] = await Promise.all([
      pool.query(
        'SELECT id, due_date, is_completed, updated_at, bounce_count FROM tasks WHERE board_id = ANY($1::uuid[])',
        [boardIds]
      ),
      pool.query(
        `SELECT COUNT(*) FROM workspace_members wm
         JOIN users u ON u.id = wm.user_id
         WHERE wm.workspace_id = $1 AND u.is_online = true`,
        [workspaceId]
      ),
      pool.query('SELECT COALESCE(SUM(bounce_count), 0) as total FROM tasks WHERE board_id = ANY($1::uuid[])', [boardIds]),
    ]);

    const openTasks = tasksRes.rows.filter((t) => !t.is_completed);
    const overdue = openTasks.filter((t) => t.due_date && new Date(t.due_date) < now);
    const stale = openTasks.filter((t) => (now - new Date(t.updated_at)) / 36e5 > 48);

    const overdueRatio = openTasks.length ? overdue.length / openTasks.length : 0;
    const staleRatio = openTasks.length ? stale.length / openTasks.length : 0;
    const totalTasksAll = tasksRes.rows.length || 1;
    const churnRatio = tasksRes.rows.filter((t) => t.bounce_count > 0).length / totalTasksAll;

    const healthScore = Math.max(0, Math.round(100 - overdueRatio * 40 - churnRatio * 30 - staleRatio * 30));

    const completionDaysRes = await pool.query(
      `SELECT DISTINCT DATE(created_at) as day FROM activity_log
       WHERE board_id = ANY($1::uuid[]) AND action = 'completed task'
       ORDER BY day DESC LIMIT 60`,
      [boardIds]
    );
    let streak = 0;
    const cursor = new Date();
    cursor.setHours(0, 0, 0, 0);
    const daySet = new Set(completionDaysRes.rows.map((r) => new Date(r.day).toDateString()));
    while (daySet.has(cursor.toDateString())) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }

    const leaderboardRes = await pool.query(
      `SELECT u.id, u.name, u.avatar_color, COUNT(*) as completed
       FROM activity_log al
       JOIN users u ON u.id = al.user_id
       WHERE al.board_id = ANY($1::uuid[]) AND al.action = 'completed task'
         AND al.created_at > NOW() - INTERVAL '7 days'
       GROUP BY u.id, u.name, u.avatar_color
       ORDER BY completed DESC LIMIT 5`,
      [boardIds]
    );

    res.json({
      online_count: parseInt(onlineRes.rows[0].count),
      total_tasks: openTasks.length,
      overdue_count: overdue.length,
      stale_count: stale.length,
      total_bounces: parseInt(bouncesRes.rows[0].total),
      health_score: healthScore,
      streak_days: streak,
      leaderboard: leaderboardRes.rows.map((r) => ({ ...r, completed: parseInt(r.completed) })),
    });
  } catch (err) { next(err); }
};

module.exports = { getWorkspacePulse };
