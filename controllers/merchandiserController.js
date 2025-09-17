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
        email: true,
        phoneNumber: true,
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
            email: true,
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

export const createTna = async (req, res) => {
  try {
    const {
      buyerId,
      style,
      itemName,
      sampleSendingDate,
      orderDate,
      status,
      sampleType = "DVP",
    } = req.body;
    const userId = req.user.id;
    console.log(buyerId,
      style,
      itemName,
      sampleSendingDate,
      orderDate,
      userId,
      status,
      sampleType)
    if (
      !buyerId ||
      !style ||
      !itemName ||
      !sampleSendingDate ||
      !orderDate ||
      !userId ||
      !sampleType
    ) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Validate date formats
    if (isNaN(Date.parse(sampleSendingDate)) || isNaN(Date.parse(orderDate))) {
      return res.status(400).json({ error: "Invalid date format" });
    }

    // Check if buyerId exists
    const buyerExists = await prisma.buyer.findUnique({
      where: { id: buyerId },
    });
    if (!buyerExists) {
      return res.status(404).json({ error: "Buyer not found" });
    }

    // Check if userId exists and is a merchandiser
    const userExists = await prisma.user.findUnique({
      where: { id: userId },
    });
    if (!userExists) {
      return res.status(404).json({ error: "User not found" });
    }
    if (userExists.role !== "MERCHANDISER") {
      return res.status(403).json({ error: "User must be a merchandiser" });
    }

    // Create new TNA
    const tna = await prisma.tNA.create({
      data: {
        buyerId,
        style,
        itemName,
        sampleSendingDate: new Date(sampleSendingDate),
        orderDate: new Date(orderDate),
        userId,
        status: status || "ACTIVE",
        sampleType,
      },
      include: {
        buyer: true,
        merchandiser: true,
      },
    });

    res.status(201).json({
      message: "TNA created successfully",
      data: tna,
    });
  } catch (error) {
    console.error("Error creating TNA:", error);
    res.status(500).json({
      error: "Internal server error",
      details: error.message,
    });
  }
};
