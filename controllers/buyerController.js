export const createBuyer = async (req, res) => {
  try {
    const { name, country, buyerDepartmentId } = req.body;

    // Validate required fields
    if (!name || !country) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const db = req.db;

    // Create buyer
    const result = await db.query(
      `INSERT INTO buyers (name, country) VALUES (?, ?)`,
      [name, country]
    );

    const newBuyerId = result.insertId;

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

    // Fetch the complete buyer data including departments
    const newBuyer = await db.query(
      `SELECT * FROM buyers WHERE id = ?`,
      [newBuyerId]
    );

    res.status(201).json({
      message: "Buyer created successfully",
      data: newBuyer[0],
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
    const db = req.db;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Build SQL query
    const buyers = await db.query(
      `SELECT b.*, bd.name as departmentName
       FROM buyers b
       LEFT JOIN buyer_departments bd ON b.id = bd.buyerId
       LIMIT ?, ?`,
      [skip, limit]
    );

    const totalResults = await db.query(`SELECT COUNT(*) as count FROM buyers`);
    const total = totalResults[0].count;

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
    const { name, country, buyerDepartmentId } = req.body;

    // Validate required fields
    if (!name || !country) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const db = req.db;

    // Update buyer
    await db.query(
      `UPDATE buyers SET name = ?, country = ?, buyerDepartmentId = ? WHERE id = ?`,
      [name, country, buyerDepartmentId || null, id]
    );

    // Fetch the updated buyer data
    const updatedBuyer = await db.query(
      `SELECT * FROM buyers WHERE id = ?`,
      [id]
    );

    res.status(200).json({
      message: "Buyer updated successfully",
      data: updatedBuyer[0],
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

    const db = req.db;

    // Delete buyer
    await db.query(`DELETE FROM buyers WHERE id = ?`, [id]);

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