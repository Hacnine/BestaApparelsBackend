import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

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
      // await prisma.auditLog.create({
      //   data: {
      //     user: "SYSTEM", // No user context for buyer creation; can be updated based on auth
      //     userRole: "SYSTEM",
      //     action: "CREATE",
      //     resource: "BUYER",
      //     resourceId: buyer.id,
      //     description: `Created new buyer ${name}`,
      //     ipAddress: req.ip,
      //     userAgent: req.get("User-Agent"),
      //     status: "SUCCESS",
      //   },
      // });

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
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const [buyers, total] = await Promise.all([
      prisma.buyer.findMany({
        skip,
        take: limit,
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
      }),
      prisma.buyer.count(),
    ]);

    // Create audit log
    // await prisma.auditLog.create({
    //   data: {
    //     user: "SYSTEM", // Update with authenticated user if available
    //     userRole: "SYSTEM",
    //     action: "READ",
    //     resource: "BUYER",
    //     resourceId: "N/A", // No specific resource ID for list fetch
    //     description: "Fetched list of buyers",
    //     ipAddress: req.ip,
    //     userAgent: req.get("User-Agent"),
    //     status: "SUCCESS",
    //   },
    // });

    res.status(200).json({
      data: buyers,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching buyers:", error);
    res.status(500).json({
      error: "Internal server error",
      details: error.message,
    });
  }
};

export const editBuyer = async (req, res) => {
  try {
    const { id } = req.params;
    const buyerId = parseInt(id, 10);
    const { name, country, buyerDepartmentId } = req.body;

    // Validate required fields
    if (!name || !country) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const updatedBuyer = await prisma.buyer.update({
      where: { id: buyerId },
      data: {
        name,
        country,
        buyerDepartmentId: buyerDepartmentId || null,
      },
      include: {
        buyerDepartments: true,
      },
    });

    res.status(200).json({
      message: "Buyer updated successfully",
      data: updatedBuyer,
    });
  } catch (error) {
    console.error("Error updating buyer:", error);
    res.status(500).json({
      error: "Internal server error",
      details: error.message,
    });
  }
};

export const deleteBuyer = async (req, res) => {
  try {
    const { id } = req.params;
    const buyerId = parseInt(id, 10);
    await prisma.buyer.delete({
      where: { id: buyerId },
    });

    res.status(200).json({
      message: "Buyer deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting buyer:", error);
    res.status(500).json({
      error: "Internal server error",
      details: error.message,
    });
  }
};