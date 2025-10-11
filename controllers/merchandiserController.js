import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export const createDepartment = async (req, res) => {
  try {
    const { name, contactPerson } = req.body;

    // Validate required fields
    if (!name || !contactPerson) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Create department
    const department = await prisma.department.create({
      data: {
        name,
        contactPerson,
      },
    });

    res.status(201).json({
      message: "Department created successfully",
      data: department,
    });
  } catch (error) {
    console.error("Error creating department:", error);
    res.status(500).json({
      error: "Internal server error",
      details: error.message,
    });
  }
};

export const getDepartments = async (req, res) => {
  try {
    const departments = await prisma.department.findMany({
      select: {
        id: true,
        name: true,
        contactPerson: true,
      },
    });

    res.status(200).json({ data: departments });
  } catch (error) {
    console.error("Error fetching departments:", error);
    res.status(500).json({
      error: "Internal server error",
      details: error.message,
    });
  }
};

export const getMerchandisers = async (req, res) => {
  try {
    const merchandisers = await prisma.employee.findMany({
      where: {
        department: "MERCHANDISING",
        status: "ACTIVE",
      },
    });
    // Remove password from each user object
    const result = merchandisers.map(({ password, ...user }) => user);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
