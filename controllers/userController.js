import { PrismaClient } from "@prisma/client";
import { checkAdmin } from "../utils/userControllerUtils.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

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

    // Hash the password before saving
    const hashedPassword = await bcrypt.hash(userData.password, 10);

    // Step 2: Create User linked to the Employee
    const user = await prisma.user.create({
      data: {
        userName: userData.userName,
        password: hashedPassword, // Save hashed password
        role: userData.role, // e.g., 'EMPLOYEE'
        employeeId: employee.id, // Link via ID
      },
      include: { employee: true }, // Optional: Include employee details in response
    });

    return res.status(200).json({ message: "User created successfully", user });
  } catch (error) {
    // Handle Prisma unique constraint error for duplicate userName
    if (error.code === "P2002" && error.meta?.target?.includes("userName")) {
      return res.status(400).json({ error: "User name already exists" });
    }
    // Handle other Prisma unique constraint errors
    if (error.code === "P2002") {
      return res.status(400).json({ error: "Unique constraint failed" });
    }
    // Handle employee not found error
    if (error.message && error.message.includes("Employee with email")) {
      return res.status(404).json({ error: error.message });
    }
    console.error("Error creating user:", error);
    return res.status(500).json({ error: "Internal server error" });
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
    const limit = 10;
    const search = req.query.search || "";
    const role = req.query.role || "";
    const skip = (page - 1) * limit;

    const roleEnumValues = [
      "ADMIN",
      "MANAGEMENT",
      "MERCHANDISER",
      "CAD",
      "SAMPLE_FABRIC",
      "SAMPLE_ROOM",
    ];

    const orFilters = [
      { userName: { contains: search } },
      { employee: { is: { email: { contains: search } } } },
      { employee: { is: { phoneNumber: { contains: search } } } },
    ];

    // Build where clause
    let where = {};
    if (search) {
      where.OR = orFilters;
    }
    if (role && roleEnumValues.includes(role)) {
      where.role = role;
    }

    // Fetch users with related employee data
    const users = await prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { userName: "desc" },
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

    // Parse id as integer and validate
    const userId = parseInt(req.params.id, 10);
    if (!userId || isNaN(userId)) {
      return res.status(400).json({ error: "User ID must be a valid integer" });
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

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
console.log(req.body);
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
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      path: "/",
    };
    res.clearCookie("access_token", cookieOptions);
    res.clearCookie("refresh_token", cookieOptions);

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

    res.cookie("access_token", accessToken, {
      ...cookieOptions,
      maxAge: 24 * 60 * 60 * 1000,
    });
    res.cookie("refresh_token", refreshToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      message: "Login successful",
      user: { id: user.id, name: user.userName, email: employee.email, role: user.role },
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
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      path: "/",
    };
    res.clearCookie("access_token", cookieOptions);
    res.clearCookie("refresh_token", cookieOptions);
  
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
