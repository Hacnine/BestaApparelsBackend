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
        contactPerson
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
    const merchandisers = await prisma.user.findMany({
      where: {
        role: "MERCHANDISER",
        employee: {
          status: "ACTIVE",
        },
      },
      include: {
        employee: true,
      },
    });
    // Remove password from each user object
    const result = merchandisers.map(({ password, ...user }) => user);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const createBuyer = async (req, res) => {
  try {
    const { name, country, buyerDepartmentId } = req.body;

    // Validate required fields
    if (!name || !country) {
      return res.status(400).json({ error: "Missing required fields" });
    }


    // Create buyer within a transaction
    const newBuyer = await prisma.$transaction(async (prisma) => {
      const buyer = await prisma.buyer.create({
        data: {
          name,
          country,
        },
        include: {
          buyerDepartments: true,
        },
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          user: "SYSTEM", // No user context for buyer creation; can be updated based on auth
          userRole: "SYSTEM",
          action: "CREATE",
          resource: "BUYER",
          resourceId: buyer.id,
          description: `Created new buyer ${name}`,
          ipAddress: req.ip,
          userAgent: req.get("User-Agent"),
          status: "SUCCESS",
        },
      });

      return buyer;
    });

    res.status(201).json({
      message: "Buyer created successfully",
      data: newBuyer,
    });
  } catch (error) {
    console.error("Error creating buyer:", error);
    res.status(500).json({
      error: "Internal server error",
      details: error.message,
    });
  }
};

export const getBuyers = async (req, res) => {
  try {
    const buyers = await prisma.buyer.findMany({
      select: {
        id: true,
        name: true,
        country: true,
        buyerDepartments: {
          select: {
            name: true,
          },
        },
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        user: "SYSTEM", // Update with authenticated user if available
        userRole: "SYSTEM",
        action: "READ",
        resource: "BUYER",
        resourceId: "N/A", // No specific resource ID for list fetch
        description: "Fetched list of buyers",
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
        status: "SUCCESS",
      },
    });

    res.status(200).json({ data: buyers });
  } catch (error) {
    console.error("Error fetching buyers:", error);
    res.status(500).json({
      error: "Internal server error",
      details: error.message,
    });
  }
};



