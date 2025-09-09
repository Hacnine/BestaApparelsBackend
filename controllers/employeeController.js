import { PrismaClient } from "@prisma/client";
import { checkAdmin } from "../utils/userControllerUtils.js";
import { getRedisClient } from "../config/redisClient.js";
const prisma = new PrismaClient();
export const createEmployee = async (req, res) => {
  try {
    await checkAdmin(req.user.id);
    const employeeData = req.body;
    const employee = await prisma.employee.create({
      data: {
        customId: employeeData.customId,
        name: employeeData.name,
        email: employeeData.email,
        status: employeeData.status || "ACTIVE",
        designation: employeeData.designation,
        department: employeeData.department,
      },
    });
    return res.status(201).json({ message: "Employee created successfully", employee });
  } catch (error) {
    console.error("Error creating employee:", error);
    throw new Error("Failed to create employee");
  }
}