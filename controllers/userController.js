import { PrismaClient } from "@prisma/client";
import { checkAdmin } from "../utils/userControllerUtils.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { getRedisClient } from "../config/redisClient.js";

const prisma = new PrismaClient();

// Get user stats

export async function getUserStats(req, res) {
  
  try {
    // Fetch all users with their related employee data
    const users = await prisma.user.findMany({
      include: {
        employee: true, // Include employee data to access status
      },
    });

    // Calculate statistics
    const roleStats = {
      total: users.length,
      active: users.filter(u => u.employee?.status === 'ACTIVE').length,
      admin: users.filter(u => u.role === 'ADMIN').length,
      management: users.filter(u => u.role === 'MANAGEMENT').length,
      merchandiser: users.filter(u => u.role === 'MERCHANDISER').length,
      cad: users.filter(u => u.role === 'CAD').length,
      sampleFabric: users.filter(u => u.role === 'SAMPLE_FABRIC').length,
      sampleRoom: users.filter(u => u.role === 'SAMPLE_ROOM').length,
    };

    // Send response
    return res.status(200).json({
      success: true,
      data: roleStats,
    });
  } catch (error) {
    console.error('Error fetching user stats:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  } finally {
    await prisma.$disconnect();
  }
}

export const createUser = async (req, res) => {
  try {
    await checkAdmin(req.user);
    const userData = req.body;
    // Step 1: Search for Employee by email
    const employee = await prisma.employee.findUnique({
      where: { email: userData.employeeEmail }, // Use the email provided for search
    });

    if (!employee) {
      throw new Error(
        `Employee with email ${userData.employeeEmail} not found`
      );
    }

    // Step 2: Create User linked to the Employee
    const user = await prisma.user.create({
      data: {
        userName: userData.userName,
        password: userData.password, // In production, hash this (e.g., with bcrypt)
        role: userData.role, // e.g., 'EMPLOYEE'
        employeeId: employee.id, // Link via ID
      },
      include: { employee: true }, // Optional: Include employee details in response
    });

    return res.status(200).json({ message: "User created successfully", user });
  } catch (error) {
    console.error("Error creating user:", error);
    throw error; // Re-throw for caller to handle
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

export const getUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const search = req.query.search || "";
    const skip = (page - 1) * limit;

    // Where clause for findMany (includes employee relation)
    const where = search
      ? {
          OR: [
            { userName: { contains: search, mode: "insensitive" } },
            { role: { contains: search, mode: "insensitive" } },
            {
              employee: {
                email: { contains: search, mode: "insensitive" },
                isNot: null,
              },
            },
            {
              employee: {
                phoneNumber: { contains: search, mode: "insensitive" },
                isNot: null,
              },
            },
          ],
        }
      : {};

    // Simplified where clause for count (excludes employee relation)
    const countWhere = search
      ? {
          OR: [
            { userName: { contains: search, mode: "insensitive" } },
            { role: { contains: search, mode: "insensitive" } },
          ],
        }
      : {};

    // Fetch users with related employee data
    const users = await prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { userName: "asc" },
      include: {
        employee: {
          select: {
            phoneNumber: true,
            email: true,
          },
        },
      },
    });

    // Map the results to include only the requested fields
    const formattedUsers = users.map((user) => ({
      id: user.id,
      userName: user.userName,
      email: user.employee?.email || null,
      role: user.role,
      phoneNumber: user.employee?.phoneNumber || null,
    }));

    // Get total count with simplified where clause
    // const totalUsers = await prisma.user.count({ where: countWhere });
const totalUsers = 0;
    // Calculate pagination metadata
    const totalPages = Math.ceil(totalUsers / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    res.status(200).json({
      success: true,
      data: formattedUsers,
      pagination: {
        currentPage: page,
        totalPages,
        totalUsers,
        limit,
        hasNextPage,
        hasPrevPage,
        search: search || null,
      },
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching users",
      error: error.message,
    });
  } finally {
    await prisma.$disconnect();
  }
};

// Toggle user status
export const toggleUserStatus = async (req, res) => {
  try {
    // Check if the requesting user is an admin
    await checkAdmin(req.user);

    const { userId } = req.params;
    const { status } = req.body;

    // Validate status
    if (!["ACTIVE", "INACTIVE"].includes(status)) {
      return res
        .status(400)
        .json({ error: "Status must be ACTIVE or INACTIVE" });
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Prevent modifying own status
    if (user.id === req.user.id) {
      return res.status(400).json({ error: "Cannot modify own status" });
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
    const isAdmin = await checkAdmin(req.user);
    if (!isAdmin) {
      return res.status(403).json({ error: "Forbidden: Admins only" });
    }

    const { id } = req.params;
    const userId = id;
    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }
    const { userName, email, role, customId } = req.body;
    console.log(req.body);
    // Prevent admin from updating their own account
    if (userId === req.user.id) {
      return res
        .status(403)
        .json({ error: "Admins cannot update their own account" });
    }

    // Ensure at least one field is provided
    if (!userName && !email && !role && !customId) {
      return res
        .status(400)
        .json({ error: "At least one field must be provided for update" });
    }

    // Validate role if provided
    if (
      role &&
      ![
        "ADMIN",
        "MANAGEMENT",
        "MERCHANDISER",
        "CAD",
        "SAMPLE_FABRIC",
        "SAMPLE_ROOM",
      ].includes(role)
    ) {
      return res.status(400).json({ error: "Invalid role value" });
    }

    // Update User + Employee
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(userName && { userName }),
        ...(role && { role }),
        employee:
          email || customId
            ? {
                update: {
                  ...(email && { email }),
                  ...(customId && { customId }),
                },
              }
            : undefined,
      },
      select: {
        id: true,
        userName: true,
        role: true,
        employee: {
          select: {
            id: true,
            customId: true,
            name: true,
            email: true,
          },
        },
      },
    });

    res.status(200).json(updatedUser);
  } catch (error) {
    console.error("Error updating user:", error);
    if (error.code === "P2002") {
      return res
        .status(400)
        .json({ error: "Email, userName, or customId already exists" });
    }
    if (error.code === "P2025") {
      return res.status(404).json({ error: "User not found" });
    }
    res.status(500).json({ error: "Internal server error" });
  }
};

export const changePassword = async (req, res) => {
  try {
    const { userId: id } = req.params;
    const { oldPassword, newPassword } = req.body;
    // Validate input
    if (!oldPassword || !newPassword) {
      return res
        .status(400)
        .json({ error: "Old password and new password are required" });
    }
    // Check if the user exists
    const user = await prisma.user.findUnique({
      where: { id: id },
      select: { password: true },
    });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    // Verify old password
    const isOldPasswordValid = await bcrypt.compare(oldPassword, user.password);
    if (!isOldPasswordValid) {
      return res.status(401).json({ error: "Old password is incorrect" });
    }
    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    // Update user password
    await prisma.user.update({
      where: { id: id },
      data: { password: hashedNewPassword },
    });
    return res.status(200).json({ message: "Password changed successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// Helper function to store tokens in Redis and set cookies
const storeToken = async (res, tokens, userId) => {
  const redisClient = getRedisClient();
  const isProduction = process.env.NODE_ENV === "production";
  const cookieOptions = {
    httpOnly: true,
    secure: isProduction, // Secure only in production
    sameSite: isProduction ? "none" : "lax", // Relax sameSite for local dev
    path: "/",
  };
  // Store tokens in Redis with expiration
  await redisClient.set(`access_token_${userId}`, tokens.access, {
    EX: 24 * 60 * 60, // 1 day in seconds
  });
  await redisClient.set(`refresh_token_${userId}`, tokens.refresh, {
    EX: 7 * 24 * 60 * 60, // 7 days in seconds
  });

  // Set tokens in cookies
  res.cookie("access_token", tokens.access, {
    ...cookieOptions,
    maxAge: 24 * 60 * 60 * 1000, // 1 day
  });
  res.cookie("refresh_token", tokens.refresh, {
    ...cookieOptions,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
};

// Helper function to remove tokens from Redis
const removeToken = async (userId) => {
  const redisClient = getRedisClient();
  await redisClient.del(`access_token_${userId}`);
  await redisClient.del(`refresh_token_${userId}`);
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    // Normalize email to lowercase
    const normalizedEmail = email.toLowerCase();

    // Find employee by email, including linked user
    const employee = await req.prisma.employee.findUnique({
      where: { email: normalizedEmail },
      include: { user: true }, // Include the linked User
    });

    if (!employee) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Check if employee has a linked user
    if (!employee.user) {
      return res
        .status(401)
        .json({ message: "No user account linked to this email" });
    }

    const user = employee.user;

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Check account status (now in Employee model)
    if (employee.status !== "ACTIVE") {
      return res.status(403).json({ message: "Account is not active" });
    }

    // Clear old tokens
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // Fixed: Use production check correctly
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      path: "/",
    };
    res.clearCookie("access_token", cookieOptions);
    res.clearCookie("refresh_token", cookieOptions);
    await removeToken(user.id);

    // Generate new tokens
    const accessToken = jwt.sign(
      { id: user.id },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: "1d" }
    );
    const refreshToken = jwt.sign(
      { id: user.id },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: "7d" }
    );

    // Store tokens in Redis and set cookies
    await storeToken(
      res,
      { access: accessToken, refresh: refreshToken },
      user.id
    );

    return res.status(200).json({
      message: "Login successful",
      user: { id: user.id, email: employee.email, role: user.role }, // Use Employee.email
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

export const logout = async (req, res) => {
  try {
    // Clear cookies
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // Align with storeToken
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      path: "/",
    };
    res.clearCookie("access_token", cookieOptions);
    res.clearCookie("refresh_token", cookieOptions);

    // Clear tokens from Redis
    if (req.id) {
      await removeToken(req.id);

      // Fetch user and linked employee for audit log
      const user = await req.prisma.user.findUnique({
        where: { id: req.id },
        include: { employee: true }, // Include Employee for email
      });
    }
    return res.status(200).json({ message: "Logout successful" });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

export const getUserInfo = async (req, res) => {
  const { userId } = req.body;
  // Check if the user exists
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }
  return res.status(200).json(user);
};
