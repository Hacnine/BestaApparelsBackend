import {
  validateDates,
  validateBuyer,
  validateUserRole,
  validateAuth,
  isDhlTrackingComplete,
} from "../utils/validationUtils.js";

// Get all TNAs with optional filters
export async function getTNAs(req, res) {
  try {
    const db = req.db;
    const {
      status,
      merchandiser,
      buyer,
      style,
      search,
      page = 1,
      pageSize = 10,
    } = req.query;
    // Build SQL WHERE clause
    let where = "WHERE 1=1";
    const params = [];
    if (req.user && req.user.id) {
      where += " AND createdById = ?";
      params.push(req.user.id);
    }
    if (status && status !== "all") {
      where += " AND status = ?";
      params.push(status);
    }
    if (merchandiser) {
      where += " AND userId = ?";
      params.push(merchandiser);
    }
    if (buyer) {
      where += " AND buyerId = ?";
      params.push(buyer);
    }
    if (style) {
      where += " AND style = ?";
      params.push(style);
    }
    if (search) {
      where += " AND (style LIKE ? OR itemName LIKE ?)";
      params.push(`%${search}%`, `%${search}%`);
    }
    const skip = (parseInt(page) - 1) * parseInt(pageSize);
    const take = parseInt(pageSize);

    const [tnas] = await db.query(
      `SELECT t.*, b.id as buyerId, b.name as buyerName, b.country, b.buyerDepartmentId,
        u.id as merchandiserId, u.userName as merchandiserUserName, u.role as merchandiserRole, u.employeeId as merchandiserEmployeeId
        FROM tnas t
        LEFT JOIN buyers b ON t.buyerId = b.id
        LEFT JOIN users u ON t.userId = u.id
        ${where}
        ORDER BY t.createdAt DESC
        LIMIT ? OFFSET ?`,
      [...params, take, skip]
    );

    const [countRows] = await db.query(
      `SELECT COUNT(*) as total FROM tnas ${where}`,
      params
    );
    const total = countRows[0].total;

    res.json({
      data: tnas,
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      total,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Create TNA
export const createTna = async (req, res) => {
  try {
    const db = req.db;
    const {
      buyerId,
      style,
      itemName,
      itemImage,
      sampleSendingDate,
      orderDate,
      status,
      sampleType = "DVP",
    } = req.body;
    const userId = req.user.id;

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

    // Use utility validation functions
    if (
      !validateAuth(req, res) ||
      !(await validateDates(sampleSendingDate, orderDate, res)) ||
      !(await validateBuyer(prisma, buyerId, res)) ||
      !(await validateUserRole(prisma, userId, "MERCHANDISER", res)) ||
      !(await isDhlTrackingComplete(res, style, false))
    ) {
      return;
    }

    // Create new TNA
    const tna = await db.tna.create({
      data: {
        buyer: { connect: { id: buyerId } },
        style,
        itemName,
        itemImage,
        sampleSendingDate: new Date(sampleSendingDate),
        orderDate: new Date(orderDate),
        merchandiser: { connect: { id: userId } },
        status: status || "ACTIVE",
        sampleType,
        createdBy: { connect: { id: req.user.id } },
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
    console.error("Error creating TNA:", error, req.body);
    res.status(500).json({
      error: "Internal server error",
      details: error.message,
      stack: error.stack,
    });
  }
};

// Update TNA
export async function updateTNA(req, res) {
  try {
    const db = req.db;
    const { id } = req.params;
    let data = req.body;

    // Remove empty string for ObjectId fields to avoid malformed ObjectId error
    if (data.buyerId === "") delete data.buyerId;
    if (data.userId === "") delete data.userId;

    const tna = await db.tna.update({ where: { id }, data });
    res.json(tna);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Delete TNA
export async function deleteTNA(req, res) {
  try {
    const db = req.db;
    const { id } = req.params;
    await db.tna.delete({ where: { id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Department progress
export async function getDepartmentProgress(req, res) {
  try {
    // Example: group by department and calculate progress
    // You may need to adjust this based on your actual schema
    const departments = await prisma.tNA.groupBy({
      by: ["currentStage"],
      _count: { id: true },
      _avg: { percentage: true },
    });
    res.json(departments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Get TNA summary (omit updatedAt, createdAt, status)
export async function getTNASummary(req, res) {
  try {
    const db = req.db;
    const { page = 1, pageSize = 10, search, startDate, endDate, completed = "false" } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(pageSize);
    const take = parseInt(pageSize);

    // Build SQL WHERE clause
    let where = "WHERE 1=1";
    const params = [];
    if (req.user && req.user.id && req.user.role === "MERCHANDISER") {
      where += " AND createdById = ?";
      params.push(req.user.id);
    }
    if (search) {
      where += " AND (style LIKE ? OR itemName LIKE ?)";
      params.push(`%${search}%`, `%${search}%`);
    }
    if (startDate && endDate) {
      where += " AND sampleSendingDate BETWEEN ? AND ?";
      params.push(new Date(startDate), new Date(endDate));
    } else if (startDate) {
      where += " AND sampleSendingDate >= ?";
      params.push(new Date(startDate));
    } else if (endDate) {
      where += " AND sampleSendingDate <= ?";
      params.push(new Date(endDate));
    }

    // Fetch all TNAs (before pagination) to filter by DHLTracking if needed
    const [allTnas] = await db.query(
      `SELECT t.id, t.style, t.itemName, t.itemImage, t.sampleSendingDate, t.orderDate, t.sampleType, t.userId,
        b.name as buyerName, u.userName as merchandiserUserName
        FROM tnas t
        LEFT JOIN buyers b ON t.buyerId = b.id
        LEFT JOIN users u ON t.userId = u.id
        ${where}
        ORDER BY t.createdAt DESC`,
      params
    );

    // If completed filter is provided, filter TNAs by DHLTracking's isComplete
    let filteredTnas = allTnas;
    if (completed === "true" || completed === "false") {
      const styles = allTnas.map(tna => tna.style);
      let dhlTrackings = [];
      if (styles.length > 0) {
        const placeholders = styles.map(() => '?').join(',');
        const [rows] = await db.query(
          `SELECT style, isComplete FROM dhl_trackings WHERE style IN (${placeholders})`,
          styles
        );
        dhlTrackings = rows;
      }
      // Build a map: style -> array of isComplete values
      const dhlMap = new Map();
      dhlTrackings.forEach(dhl => {
        if (!dhlMap.has(dhl.style)) dhlMap.set(dhl.style, []);
        dhlMap.get(dhl.style).push(dhl.isComplete);
      });

      if (completed === "true") {
        // Only styles where at least one DHLTracking isComplete === true
        const completedStyles = new Set(
          Array.from(dhlMap.entries())
            .filter(([style, arr]) => arr.some(isC => isC === true))
            .map(([style]) => style)
        );
        filteredTnas = allTnas.filter(tna => completedStyles.has(tna.style));
      } else {
        // Only styles where all DHLTracking isComplete === false OR no DHLTracking exists
        const incompleteStyles = new Set(
          allTnas
            .map(tna => tna.style)
            .filter(style => {
              if (!dhlMap.has(style)) return true; // no DHLTracking
              const arr = dhlMap.get(style);
              return arr.every(isC => isC === false);
            })
        );
        filteredTnas = allTnas.filter(tna => incompleteStyles.has(tna.style));
      }
    }

    // Pagination after filtering
    const total = filteredTnas.length;
    const pagedTnas = filteredTnas.slice(skip, skip + take);

    const summary = await Promise.all(
      pagedTnas.map(async (tna) => {
        // Get all cadDesign fields for the matching style
        const [cadRows] = await db.query(
          `SELECT * FROM cad_designs WHERE style = ? LIMIT 1`,
          [tna.style]
        );
        const cad = cadRows[0] || null;

        // Get FabricBooking for the style, omit createdAt and updatedAt
        const [fabricRows] = await db.query(
          `SELECT id, style, bookingDate, receiveDate, actualBookingDate, actualReceiveDate FROM fabric_bookings WHERE style = ? LIMIT 1`,
          [tna.style]
        );
        const fabricBooking = fabricRows[0] || null;

        // Get SampleDevelopment for the style, omit createdAt and updatedAt
        const [sampleRows] = await db.query(
          `SELECT id, style, samplemanName, sampleReceiveDate, sampleCompleteDate, actualSampleReceiveDate, actualSampleCompleteDate, sampleQuantity FROM sample_developments WHERE style = ? LIMIT 1`,
          [tna.style]
        );
        const sampleDevelopment = sampleRows[0] || null;

        // Get DHLTracking for the style, only needed fields
        const [dhlRows] = await db.query(
          `SELECT date, trackingNumber, isComplete FROM dhl_trackings WHERE style = ? LIMIT 1`,
          [tna.style]
        );
        const dhlTracking = dhlRows[0] || null;

        return {
          ...tna,
          merchandiser: tna.merchandiserUserName || null,
          buyerName: tna.buyerName || null,
          cad,
          fabricBooking,
          sampleDevelopment,
          dhlTracking,
        };
      })
    );

    res.json({
      data: summary,
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      total,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (err) {
    console.error("getTNASummary error:", err);
    res.status(500).json({ error: err.message });
  }
}

// Summary Card Function
export async function getTNASummaryCard(req, res) {
  try {
    const db = req.db;
    let whereClause = '';
    let params = [];
    if (req.user && req.user.id && req.user.role === "MERCHANDISER") {
      whereClause = 'WHERE createdById = ?';
      params.push(req.user.id);
    }

    // Fetch all TNAs with style, sampleSendingDate
    const [tnas] = await db.query(
      `SELECT id, style, sampleSendingDate FROM tnas ${whereClause}`,
      params
    );

    // Fetch all DHLTracking records for these styles
    const styles = tnas.map(tna => tna.style);
    let dhlTrackings = [];
    if (styles.length > 0) {
      const placeholders = styles.map(() => '?').join(',');
      const [rows] = await db.query(
        `SELECT style, isComplete, date FROM dhl_trackings WHERE style IN (${placeholders})`,
        styles
      );
      dhlTrackings = rows;
    }

    // Build a map for quick lookup (style -> array of DHLTracking)
    const dhlMap = {};
    dhlTrackings.forEach((dhl) => {
      if (!dhlMap[dhl.style]) dhlMap[dhl.style] = [];
      dhlMap[dhl.style].push(dhl);
    });

    let onProcess = 0;
    let completed = 0;
    let overdue = 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    tnas.forEach((tna) => {
      const dhlArr = dhlMap[tna.style] || [];
      const isAnyComplete = dhlArr.some((dhl) => dhl.isComplete);

      if (isAnyComplete) {
        completed += 1;
        return;
      }
      // Normalize sampleSendingDate to midnight
      const sampleDate = tna.sampleSendingDate
        ? new Date(tna.sampleSendingDate)
        : null;
      if (sampleDate) sampleDate.setHours(0, 0, 0, 0);

      if (dhlArr.length > 0) {
        if (sampleDate && sampleDate < today) {
          overdue += 1;
        } else {
          onProcess += 1;
        }
      } else {
        if (sampleDate && sampleDate < today) {
          overdue += 1;
        } else {
          onProcess += 1;
        }
      }
    });

    res.json({
      onProcess,
      completed,
      overdue,
      total: tnas.length,
    });
  } catch (err) {
    console.error("getTNASummaryCard error:", err);
    res.status(500).json({ error: err.message });
  }
}

// Department Progress API (dynamic)
export async function getDepartmentProgressV2(req, res) {
  try {
    const db = req.db;
    // Only TNAs visible to the user (MERCHANDISER: own, others: all)
    let whereClause = '';
    let params = [];
    if (req.user && req.user.id && req.user.role === "MERCHANDISER") {
      whereClause = 'WHERE createdById = ?';
      params.push(req.user.id);
    }

    // Get all TNAs (style, id)
    const [tnas] = await db.query(
      `SELECT id, style FROM tnas ${whereClause}`,
      params
    );
    const styles = tnas.map(tna => tna.style);

    let cadDesigns = [], fabricBookings = [], sampleDevelopments = [], dhlTrackings = [];
    if (styles.length > 0) {
      const placeholders = styles.map(() => '?').join(',');
      // CAD
      [cadDesigns] = await db.query(
        `SELECT style, finalCompleteDate FROM cad_designs WHERE style IN (${placeholders})`,
        styles
      );
      // Fabric
      [fabricBookings] = await db.query(
        `SELECT style, actualReceiveDate FROM fabric_bookings WHERE style IN (${placeholders})`,
        styles
      );
      // Sample
      [sampleDevelopments] = await db.query(
        `SELECT style, actualSampleCompleteDate FROM sample_developments WHERE style IN (${placeholders})`,
        styles
      );
      // DHL
      [dhlTrackings] = await db.query(
        `SELECT style FROM dhl_trackings WHERE style IN (${placeholders})`,
        styles
      );
    }

    // Build lookup maps for quick access
    const cadMap = new Map();
    cadDesigns.forEach(cad => {
      if (!cadMap.has(cad.style)) cadMap.set(cad.style, []);
      cadMap.get(cad.style).push(cad);
    });
    const fabricMap = new Map();
    fabricBookings.forEach(fb => {
      if (!fabricMap.has(fb.style)) fabricMap.set(fb.style, []);
      fabricMap.get(fb.style).push(fb);
    });
    const sampleMap = new Map();
    sampleDevelopments.forEach(sd => {
      if (!sampleMap.has(sd.style)) sampleMap.set(sd.style, []);
      sampleMap.get(sd.style).push(sd);
    });
    const dhlSet = new Set(dhlTrackings.map(dhl => dhl.style));

    // Progress calculation
    const departments = [
      {
        department: "Merchandising",
        isComplete: (style) => dhlSet.has(style)
      },
      {
        department: "CAD",
        isComplete: (style) =>
          (cadMap.get(style) || []).some(cad => !!cad.finalCompleteDate)
      },
      {
        department: "Fabric",
        isComplete: (style) =>
          (fabricMap.get(style) || []).some(fb => !!fb.actualReceiveDate)
      },
      {
        department: "Sample",
        isComplete: (style) =>
          (sampleMap.get(style) || []).some(sd => !!sd.actualSampleCompleteDate)
      }
    ];

    const result = departments.map(dept => {
      let completed = 0;
      tnas.forEach(tna => {
        if (dept.isComplete(tna.style)) completed += 1;
      });
      const total = tnas.length;
      const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);
      return {
        department: dept.department,
        completed,
        total,
        percentage
      };
    });

    res.json({ data: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

