import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// Get all users with optional search/filter
export async function getUsers(req, res) {
  try {
    const { search, role, status, department } = req.query;
    const where = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ];
    }
    if (role && role !== 'all') where.role = role;
    if (status && status !== 'all') where.status = status;
    if (department) where.department = department;
    const users = await prisma.user.findMany({ where });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Get user stats
export async function getUserStats(req, res) {
  try {
    const total = await prisma.user.count();
    const active = await prisma.user.count({ where: { status: 'Active' } });
    const roles = await prisma.user.groupBy({
      by: ['role'],
      _count: { role: true }
    });
    res.json({ total, active, roles });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Create user
export async function createUser(req, res) {
  try {
    const { name, email, role, status, department } = req.body;
    const user = await prisma.user.create({
      data: { name, email, role, status, department, lastLogin: new Date() }
    });
    res.status(201).json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Update user
export async function updateUser(req, res) {
  try {
    const { id } = req.params;
    const { name, email, role, status, department } = req.body;
    const user = await prisma.user.update({
      where: { id },
      data: { name, email, role, status, department }
    });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Delete user
export async function deleteUser(req, res) {
  try {
    const { id } = req.params;
    await prisma.user.delete({ where: { id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Toggle user status
export async function toggleUserStatus(req, res) {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    const newStatus = user.status === 'Active' ? 'Inactive' : 'Active';
    const updated = await prisma.user.update({
      where: { id },
      data: { status: newStatus }
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
