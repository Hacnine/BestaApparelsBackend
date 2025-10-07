import { PrismaClient } from "@prisma/client";
import {
  validateDates,
  validateBuyer,
  validateUserRole,
  validateAuth,
  isDhlTrackingComplete,
} from "../utils/validationUtils.js";
const prisma = new PrismaClient();

// Get all TNAs with optional filters
export async function getTNAs(req, res) {
  try {
    const {
      status,
      merchandiser,
      buyer,
      style,
      search,
      page = 1,
      pageSize = 10,
    } = req.query;
    const where = {
      // Only return TNAs created by the current user
      createdById: req.user && req.user.id ? req.user.id : undefined,
    };
    if (status && status !== "all") where.status = status;
    if (merchandiser) where.userId = merchandiser; // merchandiser is userId
    if (buyer) where.buyerId = buyer; // buyer is buyerId
    if (style) where.style = style;
    if (search) {
      where.OR = [
        { style: { contains: search } },
        { itemName: { contains: search } },
        { buyer: { name: { contains: search } } },
      ];
    }
    const skip = (parseInt(page) - 1) * parseInt(pageSize);
    const take = parseInt(pageSize);

    const [tnas, total] = await Promise.all([
      prisma.tNA.findMany({
        where,
        select: {
          id: true,
          style: true,
          itemName: true,
          itemImage: true,
          sampleSendingDate: true,
          orderDate: true,
          status: true,
          sampleType: true,
          createdAt: true,
          updatedAt: true,
          buyer: {
            select: {
              id: true,
              name: true,
              country: true,
              buyerDepartmentId: true,
            },
          },
          merchandiser: {
            select: {
              id: true,
              userName: true,
              role: true,
              employeeId: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
      prisma.tNA.count({ where }),
    ]);

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
    const tna = await prisma.tNA.create({
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
    const { id } = req.params;
    const tnaId = parseInt(id, 10);
    let data = req.body;

    // Remove empty string for ObjectId fields to avoid malformed ObjectId error
    if (data.buyerId === "") delete data.buyerId;
    if (data.userId === "") delete data.userId;

    const tna = await prisma.tNA.update({ where: { id: tnaId }, data });
    res.json(tna);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Delete TNA
export async function deleteTNA(req, res) {
  try {
    const { id } = req.params;
    const tnaId = parseInt(id, 10);
    await prisma.tNA.delete({ where: { id: tnaId } });
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
    const { page = 1, pageSize = 10, search, startDate, endDate, completed = "false" } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(pageSize);
    const take = parseInt(pageSize);

    // Build where clause for search
    const where = {};

    // Only return TNAs created by the current user if role is MERCHANDISER
    if (
      req.user &&
      req.user.id &&
      req.user.role === "MERCHANDISER"
    ) {
      where.createdById = req.user.id;
    }

    // Search by name (style, itemName, buyerName, merchandiser)
    if (search) {
      where.OR = [
        { style: { contains: search } },
        { itemName: { contains: search } },
        { buyer: { name: { contains: search } } },
        {
          merchandiser: { userName: { contains: search } },
        },
      ];
    }

    // Search by date range (sampleSendingDate)
    if (startDate && endDate) {
      where.sampleSendingDate = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    } else if (startDate) {
      where.sampleSendingDate = {
        gte: new Date(startDate),
      };
    } else if (endDate) {
      where.sampleSendingDate = {
        lte: new Date(endDate),
      };
    }

    // Fetch all TNAs (before pagination) to filter by DHLTracking if needed
    let allTnas = await prisma.tNA.findMany({
      where,
      select: {
        id: true,
        buyer: { select: { name: true } },
        style: true,
        itemName: true,
        itemImage: true,
        sampleSendingDate: true,
        orderDate: true,
        merchandiser: { select: { userName: true } },
        sampleType: true,
        userId: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // If completed filter is provided, filter TNAs by DHLTracking's isComplete
    if (completed === "true" || completed === "false") {
      const styles = allTnas.map(tna => tna.style);
      // Get all DHLTracking for these styles
      const dhlTrackings = await prisma.dHLTracking.findMany({
        where: { style: { in: styles } },
        select: { style: true, isComplete: true },
      });
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
        allTnas = allTnas.filter(tna => completedStyles.has(tna.style));
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
        allTnas = allTnas.filter(tna => incompleteStyles.has(tna.style));
      }
    }

    // Pagination after filtering
    const total = allTnas.length;
    const pagedTnas = allTnas.slice(skip, skip + take);

    const summary = await Promise.all(
      pagedTnas.map(async (tna) => {
        // Get all cadDesign fields for the matching style
        const cad = await prisma.cadDesign.findFirst({
          where: { style: tna.style },
        });

        // Get FabricBooking for the style, omit createdAt and updatedAt
        const fabricBooking = await prisma.fabricBooking.findFirst({
          where: { style: tna.style },
          select: {
            id: true,
            style: true,
            bookingDate: true,
            receiveDate: true,
            actualBookingDate: true,
            actualReceiveDate: true,
          },
        });

        // Get SampleDevelopment for the style, omit createdAt and updatedAt
        const sampleDevelopment = await prisma.sampleDevelopment.findFirst({
          where: { style: tna.style },
          select: {
            id: true,
            style: true,
            samplemanName: true,
            sampleReceiveDate: true,
            sampleCompleteDate: true,
            actualSampleReceiveDate: true,
            actualSampleCompleteDate: true,
            sampleQuantity: true,
          },
        });

        // Get DHLTracking for the style, only needed fields
        let dhlTracking = await prisma.dHLTracking.findFirst({
          where: { style: tna.style },
          select: {
            date: true,
            trackingNumber: true,
            isComplete: true,
          },
        });

        // If not found, set to null
        if (!dhlTracking) dhlTracking = null;

        return {
          ...tna,
          merchandiser: tna.merchandiser?.userName || null,
          buyerName: tna.buyer?.name || null,
          cad,
          fabricBooking, // will be null if not found
          sampleDevelopment, // will be null if not found
          dhlTracking, // will be null if not found
        };
      })
    );

    const cleaned = summary.map(({ buyer, ...rest }) => rest);
    res.json({
      data: cleaned,
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
    // Build where clause for filtering TNAs
    const where = {};
    if (req.user && req.user.id && req.user.role === "MERCHANDISER") {
      where.createdById = req.user.id;
    }

    // Fetch all TNAs with style, sampleSendingDate, and related DHLTracking
    const tnas = await prisma.tNA.findMany({
      where,
      select: {
        id: true,
        style: true,
        sampleSendingDate: true,
      },
    });

    // Fetch all DHLTracking records for these styles
    const styles = tnas.map((tna) => tna.style);
    const dhlTrackings = await prisma.dHLTracking.findMany({
      where: { style: { in: styles } },
      select: {
        style: true,
        isComplete: true,
        date: true,
      },
    });

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
    // Only TNAs visible to the user (MERCHANDISER: own, others: all)
    const where = {};
    if (req.user && req.user.id && req.user.role === "MERCHANDISER") {
      where.createdById = req.user.id;
    }

    // Get all TNAs (style, id)
    const tnas = await prisma.tNA.findMany({
      where,
      select: { id: true, style: true }
    });
    const styles = tnas.map(tna => tna.style);

    // Fetch all related records in batch
    const [
      cadDesigns,
      fabricBookings,
      sampleDevelopments,
      dhlTrackings
    ] = await Promise.all([
      prisma.cadDesign.findMany({
        where: { style: { in: styles } },
        select: { style: true, finalCompleteDate: true }
      }),
      prisma.fabricBooking.findMany({
        where: { style: { in: styles } },
        select: { style: true, actualReceiveDate: true }
      }),
      prisma.sampleDevelopment.findMany({
        where: { style: { in: styles } },
        select: { style: true, actualSampleCompleteDate: true }
      }),
      prisma.dHLTracking.findMany({
        where: { style: { in: styles } },
        select: { style: true }
      })
    ]);

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

