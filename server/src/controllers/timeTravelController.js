const pool = require('../config/db');

const getTimeline = async (req, res, next) => {
  try {
    const { boardId } = req.params;
    const result = await pool.query(
      `SELECT MIN(created_at) as start, MAX(created_at) as end, COUNT(*) as total_events
       FROM activity_log WHERE board_id = $1`,
      [boardId]
    );
    res.json(result.rows[0]);
  } catch (err) { next(err); }
};

const getBoardAtTime = async (req, res, next) => {
  try {
    const { boardId } = req.params;
    const targetTime = req.query.at ? new Date(req.query.at) : new Date();

    const columnsResult = await pool.query(
      'SELECT id, name, position, color FROM columns WHERE board_id = $1 ORDER BY position',
      [boardId]
    );

    const eventsResult = await pool.query(
      `SELECT action, entity_id, meta, created_at FROM activity_log
       WHERE board_id = $1 AND entity_type = 'task' AND created_at <= $2
       ORDER BY created_at ASC`,
      [boardId, targetTime]
    );

    const taskState = new Map();
    for (const ev of eventsResult.rows) {
      const meta = ev.meta || {};
      const existing = taskState.get(ev.entity_id) || {};

      if (ev.action === 'created task') {
        taskState.set(ev.entity_id, { title: meta.title, column_id: meta.column_id, exists: true });
      } else if (ev.action === 'moved task') {
        taskState.set(ev.entity_id, { ...existing, column_id: meta.column_id, exists: existing.exists !== false });
      } else if (ev.action === 'deleted task') {
        taskState.set(ev.entity_id, { ...existing, exists: false });
      } else if (ev.action === 'updated task' && meta.title) {
        taskState.set(ev.entity_id, { ...existing, title: meta.title });
      }
    }

    const columns = columnsResult.rows.map((col) => ({
      ...col,
      tasks: [...taskState.entries()]
        .filter(([, t]) => t.exists && t.column_id === col.id)
        .map(([id, t]) => ({ id, title: t.title || 'Untitled task' })),
    }));

    res.json({ timestamp: targetTime.toISOString(), columns, eventCount: eventsResult.rows.length });
  } catch (err) { next(err); }
};

module.exports = { getTimeline, getBoardAtTime };
