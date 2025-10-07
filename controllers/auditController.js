// Remove: import { PrismaClient } from '@prisma/client};
// Use req.db for SQL queries

// Get audit logs with filters
export async function getAuditLogs(req, res) {
  try {
    const db = req.db;
    const { action, userRole, timeRange, search } = req.query;
    let where = 'WHERE 1=1';
    const params = [];

    if (action && action !== 'all') {
      where += ` AND action = ?`;
      params.push(action);
    }
    if (userRole && userRole !== 'all') {
      where += ` AND userRole = ?`;
      params.push(userRole);
    }
    if (search) {
      where += ` AND (user LIKE ? OR description LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }
    // Time range filter (example for last X days)
    if (timeRange) {
      const now = new Date();
      let from;
      if (timeRange === '1h') from = new Date(now.getTime() - 60 * 60 * 1000);
      else if (timeRange === '24h') from = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      else if (timeRange === '7d') from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      else if (timeRange === '30d') from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      if (from) {
        where += ` AND timestamp >= ?`;
        params.push(from.toISOString().slice(0, 19).replace('T', ' '));
      }
    }
    const logs = await db.query(`SELECT * FROM audit_logs ${where} ORDER BY timestamp DESC`, params);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Create audit log
export async function createAuditLog(req, res) {
  try {
    const db = req.db;
    const data = req.body;
    const log = await db.query(`INSERT INTO audit_logs (action, userRole, user, description, timestamp) VALUES (?, ?, ?, ?, ?)`, 
      [data.action, data.userRole, data.user, data.description, new Date()]);
    res.status(201).json(log);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Export logs (as JSON)
export async function exportAuditLogs(req, res) {
  try {
    const db = req.db;
    const logsExport = await db.query(`SELECT * FROM audit_logs`);
    res.setHeader('Content-Disposition', 'attachment; filename=audit-logs.json');
    res.json(logsExport);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
