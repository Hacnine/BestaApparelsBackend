// Remove: import { PrismaClient } from '@prisma/client};
// Use req.db for SQL queries

// Dashboard stats
export async function getDashboardStats(req, res) {
  try {
    const db = req.db;
    const [[{ totalUsers }]] = await db.query("SELECT COUNT(*) as totalUsers FROM users");
    const [[{ activeTNAs }]] = await db.query("SELECT COUNT(*) as activeTNAs FROM tnas WHERE status = 'On Track'");
    const [[{ overdueTasks }]] = await db.query("SELECT COUNT(*) as overdueTasks FROM tnas WHERE status = 'Overdue'");
    // Example: On-Time Delivery %
    const [[{ allTNAs }]] = await db.query("SELECT COUNT(*) as allTNAs FROM tnas");
    const onTimeDelivery = allTNAs ? Math.round((activeTNAs / allTNAs) * 100) : 0;
    res.json({ totalUsers, activeTNAs, overdueTasks, onTimeDelivery });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Recent activities
export async function getRecentActivities(req, res) {
  try {
    const db = req.db;
    const [activities] = await db.query("SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 10");
    res.json(activities);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Department progress
export async function getDashboardDepartmentProgress(req, res) {
  try {
    const db = req.db;
    const [departments] = await db.query(`
      SELECT currentStage, COUNT(*) as count, AVG(percentage) as avgPercentage
      FROM tnas
      GROUP BY currentStage
    `);
    res.json(departments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
