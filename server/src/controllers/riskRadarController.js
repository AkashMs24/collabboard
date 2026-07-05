const pool = require('../config/db');
const { callGroq } = require('../utils/groq');

const STALE_HOURS = 48;

const getRiskRadar = async (req, res, next) => {
  try {
    const { boardId } = req.params;
    const result = await pool.query(
      `SELECT t.id, t.title, t.priority, t.due_date, t.updated_at,
              c.name as column_name, u.name as assignee_name
       FROM tasks t
       JOIN columns c ON c.id = t.column_id
       LEFT JOIN users u ON u.id = t.assignee_id
       WHERE t.board_id = $1 AND t.is_completed = false`,
      [boardId]
    );

    const now = Date.now();
    const risks = [];

    for (const t of result.rows) {
      const hoursSinceUpdate = (now - new Date(t.updated_at).getTime()) / 36e5;
      const isStale = hoursSinceUpdate > STALE_HOURS && t.column_name !== 'Backlog';

      let dueStatus = null;
      if (t.due_date) {
        const hoursUntilDue = (new Date(t.due_date).getTime() - now) / 36e5;
        if (hoursUntilDue < 0) dueStatus = 'overdue';
        else if (hoursUntilDue < 48) dueStatus = 'due_soon';
      }

      if (isStale || dueStatus) {
        risks.push({
          task_id: t.id, title: t.title, column: t.column_name,
          assignee: t.assignee_name, priority: t.priority,
          hours_stale: isStale ? Math.round(hoursSinceUpdate) : null,
          due_status: dueStatus,
        });
      }
    }

    risks.sort((a, b) => {
      const score = (r) => (r.due_status === 'overdue' ? 3 : r.due_status === 'due_soon' ? 2 : 0) + (r.hours_stale ? 1 : 0);
      return score(b) - score(a);
    });

    let narrative = 'No significant risks detected right now.';
    if (risks.length > 0 && process.env.GROQ_API_KEY) {
      const top = risks.slice(0, 5).map((r) =>
        `"${r.title}" (${r.column}, ${r.assignee || 'unassigned'}${r.hours_stale ? `, untouched ${r.hours_stale}h` : ''}${r.due_status ? `, ${r.due_status.replace('_', ' ')}` : ''})`
      ).join('; ');

      const prompt = `You are a pragmatic engineering manager reviewing a Kanban board. At-risk tasks: ${top}.
Write a 3-sentence risk briefing: what's most concerning, likely cause, one concrete action. No preamble, no markdown.`;

      try {
        narrative = await callGroq(prompt, 200);
      } catch { /* keep default narrative */ }
    }

    res.json({ risks, narrative, generated_at: new Date().toISOString() });
  } catch (err) { next(err); }
};

module.exports = { getRiskRadar };
