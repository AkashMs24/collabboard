const pool = require('../config/db');

const getChurnRadar = async (req, res, next) => {
  try {
    const { boardId } = req.params;

    const bounciest = await pool.query(
      `SELECT t.id, t.title, t.bounce_count, c.name as column_name
       FROM tasks t JOIN columns c ON c.id = t.column_id
       WHERE t.board_id = $1 AND t.bounce_count > 0
       ORDER BY t.bounce_count DESC LIMIT 10`,
      [boardId]
    );

    const totals = await pool.query(
      `SELECT COUNT(*) FILTER (WHERE bounce_count > 0) as bounced_tasks,
              COUNT(*) as total_tasks,
              COALESCE(SUM(bounce_count), 0) as total_bounces
       FROM tasks WHERE board_id = $1`,
      [boardId]
    );

    const notes = await pool.query(
      `SELECT tb.task_id, tb.ai_retro_note, tb.created_at
       FROM task_bounces tb
       WHERE tb.board_id = $1 AND tb.ai_retro_note IS NOT NULL
       ORDER BY tb.created_at DESC LIMIT 5`,
      [boardId]
    );

    const { bounced_tasks, total_tasks, total_bounces } = totals.rows[0];
    const churnRate = total_tasks > 0 ? Number(bounced_tasks) / Number(total_tasks) : 0;

    res.json({
      churn_rate: Math.round(churnRate * 100),
      total_bounces: Number(total_bounces),
      bounciest_tasks: bounciest.rows,
      retro_notes: notes.rows,
    });
  } catch (err) { next(err); }
};

module.exports = { getChurnRadar };
