import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// Dashboard stats
export async function getDashboardStats(req, res) {
  try {
    const totalUsers = await prisma.user.count();
    const activeTNAs = await prisma.tNA.count({ where: { status: 'On Track' } });
    const overdueTasks = await prisma.tNA.count({ where: { status: 'Overdue' } });
    // Example: On-Time Delivery %
    const allTNAs = await prisma.tNA.count();
    const onTimeDelivery = allTNAs ? Math.round((activeTNAs / allTNAs) * 100) : 0;
    res.json({ totalUsers, activeTNAs, overdueTasks, onTimeDelivery });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Recent activities
export async function getRecentActivities(req, res) {
  try {
    const activities = await prisma.auditLog.findMany({
      orderBy: { timestamp: 'desc' },
      take: 10
    });
    res.json(activities);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Department progress
export async function getDashboardDepartmentProgress(req, res) {
  try {
    const departments = await prisma.tNA.groupBy({
      by: ['currentStage'],
      _count: { id: true },
      _avg: { percentage: true }
    });
    res.json(departments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
