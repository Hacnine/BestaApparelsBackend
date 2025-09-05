import { PrismaClient } from '@prisma/client';
import { checkAdmin } from '../utils/userControllerUtils.js';
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

// Controller to create a new user (Admin only)
export const createUser = async (req, res) => {
  try {
    // Check if the requesting user is an admin
    await checkAdmin(req.user.id); // Assuming req.user contains authenticated user info (e.g., from JWT)

    const { customId, name, email, password, role, status, department } = req.body;

    // Validate required fields
    if (!customId || !name || !email || !password) {
      return res.status(400).json({ error: 'customId, name, email, and password are required' });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create the user
    const user = await prisma.user.create({
      data: {
        customId,
        name,
        email,
        password: hashedPassword,
        role: role || 'USER', // Default to USER if not provided
        status: status || 'PENDING', // Default to PENDING if not provided
        department: department || '',
      },
    });

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;
    return res.status(201).json(userWithoutPassword);
  } catch (error) {
    console.error(error);
    return res.status(403).json({ error: error.message });
  }
};

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
export const toggleUserStatus = async (req, res) => {
  try {
    // Check if the requesting user is an admin
    await checkAdmin(req.user.id);

    const { userId } = req.params;
    const { status } = req.body;

    // Validate status
    if (!['ACTIVE', 'INACTIVE'].includes(status)) {
      return res.status(400).json({ error: 'Status must be ACTIVE or INACTIVE' });
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prevent modifying own status
    if (user.id === req.user.id) {
      return res.status(400).json({ error: 'Cannot modify own status' });
    }

    // Update user status
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { status },
    });

    return res.status(200).json(updatedUser);
  } catch (error) {
    console.error(error);
    return res.status(403).json({ error: error.message });
  }
};


export const updateUser = async (req, res) => {
  try {
    // Check if the requesting user is an admin
    const isAdmin = await checkAdmin(req.user.id);
    if (!isAdmin) {
      return res.status(403).json({ error: 'Only admins can update users' });
    }

    const { userId } = req.params;
    const { name, email, customId, role, status, department } = req.body;

    // Prevent admin from updating their own account
    if (userId === req.user.id) {
      return res.status(403).json({ error: 'Admins cannot update their own account' });
    }

    // Check if the user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Validate input fields
    if (!name && !email && !customId && !role && !status && !department) {
      return res.status(400).json({ error: 'At least one field must be provided for update' });
    }

    // Validate role and status if provided
    if (role && !['ADMIN', 'USER', 'MANAGER', 'GUEST'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role value' });
    }
    if (status && !['ACTIVE', 'INACTIVE', 'PENDING', 'SUSPENDED'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }

    // Prepare update data
    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (customId) updateData.customId = customId;
    if (role) updateData.role = role;
    if (status) updateData.status = status;
    if (department) updateData.department = department;

    // Update the user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        customId: true,
        name: true,
        email: true,
        role: true,
        status: true,
        department: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.status(200).json(updatedUser);
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Email or customId already exists' });
    }
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'User not found' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
}

export const changePassword = async (req, res) => {
  try {
    const { userId: id } = req.params;
    const { oldPassword, newPassword } = req.body;
    // Validate input
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: 'Old password and new password are required' });
    }
    // Check if the user exists
    const user = await prisma.user.findUnique({
      where: { id: id },
      select: { password: true }
    });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    // Verify old password
    const isOldPasswordValid = await bcrypt.compare(oldPassword, user.password);
    if (!isOldPasswordValid) {
      return res.status(401).json({ error: 'Old password is incorrect' });
    }
    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    // Update user password
    await prisma.user.update({
      where: { id: id },
      data: { password: hashedNewPassword },
    });
    return res.status(200).json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Generate JWT token
    const token = jwt.sign({ id: user.id }, process.env.ACCESS_TOKEN_SECRET, {
      expiresIn: "1h", // Token expires in 1 hour
    });

    // Set token in cookie
    res.cookie("access_token", token, {
      httpOnly: true, // Prevents client-side JavaScript access
      secure: process.env.NODE_ENV === "production", // Use secure cookies in production
      sameSite: "strict", // Mitigates CSRF attacks
      maxAge: 60 * 60 * 1000, // 1 hour in milliseconds
    });

    // Update lastLogin
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    // Log the login action in AuditLog
    await prisma.auditLog.create({
      data: {
        user: user.email,
        userRole: user.role,
        action: "LOGIN",
        resource: "USER",
        resourceId: user.id,
        description: `User ${user.email} logged in`,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent") || "Unknown",
        status: "SUCCESS",
      },
    });

    return res.status(200).json({
      message: "Login successful",
      user: { id: user.id, email: user.email, role: user.role },
    });
  } catch (error) {
    // Log error in AuditLog
    await prisma.auditLog.create({
      data: {
        user: req.body.email || "Unknown",
        userRole: "UNKNOWN",
        action: "LOGIN",
        resource: "USER",
        resourceId: "N/A",
        description: `Login attempt failed: ${error.message}`,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent") || "Unknown",
        status: "FAILED",
      },
    });

    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const logout = async (req, res) => {
  try {
    // Clear the access_token cookie
    res.clearCookie("access_token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    // Log the logout action in AuditLog (using req.id from middleware)
    if (req.id) {
      const user = await prisma.user.findUnique({
        where: { id: req.id },
      });

      if (user) {
        await prisma.auditLog.create({
          data: {
            user: user.email,
            userRole: user.role,
            action: "LOGOUT",
            resource: "USER",
            resourceId: user.id,
            description: `User ${user.email} logged out`,
            ipAddress: req.ip,
            userAgent: req.get("User-Agent") || "Unknown",
            status: "SUCCESS",
          },
        });
      }
    }

    return res.status(200).json({ message: "Logout successful" });
  } catch (error) {
    // Log error in AuditLog
    await prisma.auditLog.create({
      data: {
        user: "Unknown",
        userRole: "UNKNOWN",
        action: "LOGOUT",
        resource: "USER",
        resourceId: req.id || "N/A",
        description: `Logout attempt failed: ${error.message}`,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent") || "Unknown",
        status: "FAILED",
      },
    });

    return res.status(500).json({ message: "Server error", error: error.message });
  }
};