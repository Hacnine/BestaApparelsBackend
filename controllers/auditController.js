import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// Get audit logs with filters
export async function getAuditLogs(req, res) {
  try {
    const { action, userRole, timeRange, search } = req.query;
    const where = {};
    if (action && action !== 'all') where.action = action;
    if (userRole && userRole !== 'all') where.userRole = userRole;
    if (search) {
      where.OR = [
        { user: { contains: search } },
        { description: { contains: search } }
      ];
    }
    // Time range filter (example for last X days)
    if (timeRange) {
      const now = new Date();
      let from;
      if (timeRange === '1h') from = new Date(now.getTime() - 60 * 60 * 1000);
      else if (timeRange === '24h') from = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      else if (timeRange === '7d') from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      else if (timeRange === '30d') from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      if (from) where.timestamp = { gte: from };
    }
    const logs = await prisma.auditLog.findMany({ where, orderBy: { timestamp: 'desc' } });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Create audit log
export async function createAuditLog(req, res) {
  try {
    const data = req.body;
    const log = await prisma.auditLog.create({ data });
    res.status(201).json(log);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Export logs (as JSON)
export async function exportAuditLogs(req, res) {
  try {
    const logs = await prisma.auditLog.findMany();
    res.setHeader('Content-Disposition', 'attachment; filename=audit-logs.json');
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
