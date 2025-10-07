import { PrismaClient } from "@prisma/client";
import { checkAdmin } from "../utils/userControllerUtils.js";
const prisma = new PrismaClient();

export const createEmployee = async (req, res) => {
  try {
    await checkAdmin(req.user);
    const employeeData = req.body;
    const employee = await prisma.employee.create({
      data: {
        customId: employeeData.customId,
        name: employeeData.name,
        phoneNumber: employeeData.phoneNumber,
        email: employeeData.email,
        status: employeeData.status || "ACTIVE",
        designation: employeeData.designation,
        department: employeeData.department,
      },
    });
    return res.status(201).json({ message: "Employee created successfully", employee });
  } catch (error) {
     // Handle Prisma unique constraint error for duplicate customId
    if (error.code === "P2002" && error.meta?.target?.includes("customId")) {
      return res.status(400).json({ message: "Custom ID already exists, please choose another." });
    }
  }
}

export const getEmployees = async (req, res) => {
  try {
   
    const page = parseInt(req.query.page) || 1;
    const limit = 20; 
    const search = req.query.search || ''; 
    const skip = (page - 1) * limit;

  
    const where = {};
    if (search) {
      where.OR = [
        { customId: { contains: search } },
        { email: { contains: search } },
        { department: { contains: search } },
        { designation: { contains: search } },
      ];
    }

    const employees = await prisma.employee.findMany({
      where,
      skip: skip,
      take: limit,
      orderBy: { customId: 'asc' }, 
      include: { user: true },
    });

    // Get total count (with search applied for accurate pagination)
    const totalEmployees = await prisma.employee.count({ where });

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalEmployees / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    res.status(200).json({
      success: true,
      data: employees,
      pagination: {
        currentPage: page,
        totalPages: totalPages,
        totalEmployees: totalEmployees,
        limit: limit,
        hasNextPage: hasNextPage,
        hasPrevPage: hasPrevPage,
        search: search || null, // Include search term in response for UI
      },
    });
  } catch (error) {
    console.error('Error fetching employees:', error);
    res.status(500).json({ success: false, message: 'Error fetching employees', error: error.message });
  }
};

export const updateEmployeeStatus = async (req, res) => {
  try {
    const { id } = req.params; 
    const { status } = req.body; 

    if (!['ACTIVE', 'INACTIVE'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status. Must be ACTIVE or INACTIVE.' });
    }

    const updatedEmployee = await prisma.employee.update({
      where: { id },
      data: { status },
      include: { user: true }, // Include related user if needed
    });

    if (!updatedEmployee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    res.status(200).json({
      success: true,
      data: updatedEmployee,
      message: `Employee status updated to ${status}`,
    });
  } catch (error) {
    console.error('Error updating employee status:', error);
    res.status(500).json({ success: false, message: 'Error updating employee status', error: error.message });
  }
};