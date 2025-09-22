import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// Get all TNAs with optional filters
export async function getTNAs(req, res) {
  try {
    const { status, merchandiser, buyer, style, search, page = 1, pageSize = 10 } = req.query;
    const where = {};
    if (status && status !== 'all') where.status = status;
    if (merchandiser) where.merchandiser = merchandiser;
    if (buyer) where.buyer = buyer;
    if (style) where.style = style;
    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { buyer: { contains: search, mode: 'insensitive' } },
        { style: { contains: search, mode: 'insensitive' } }
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
              buyerDepartmentId: true
            }
          },
          merchandiser: {
            select: {
              id: true,
              userName: true,
              role: true,
              employeeId: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take
      }),
      prisma.tNA.count({ where })
    ]);

    res.json({
      data: tnas,
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      total,
      totalPages: Math.ceil(total / pageSize)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Create TNA
export async function createTNA(req, res) {
  try {
    const data = req.body;
    const tna = await prisma.tNA.create({ data });
    res.status(201).json(tna);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Update TNA
export async function updateTNA(req, res) {
  try {
    const { id } = req.params;
    const data = req.body;
    const tna = await prisma.tNA.update({ where: { id }, data });
    res.json(tna);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Delete TNA
export async function deleteTNA(req, res) {
  try {
    const { id } = req.params;
    await prisma.tNA.delete({ where: { id } });
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
      by: ['currentStage'],
      _count: { id: true },
      _avg: { percentage: true }
    });
    res.json(departments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}


// Get TNA summary (omit updatedAt, createdAt, status)
export async function getTNASummary(req, res) {
  try {
    const tnas = await prisma.tNA.findMany({
      select: {
        id: true,
        buyer: { select: { name: true } },
        style: true,
        itemName: true,
        sampleSendingDate: true,
        orderDate: true,
        merchandiser: { select: { userName: true } },
        sampleType: true,
        userId: true,
        // omit: createdAt, updatedAt, status, buyerId
      }
    });

    const summary = await Promise.all(
      tnas.map(async tna => {
        // Get all cadDesign fields for the matching style
        const cad = await prisma.cadDesign.findFirst({
          where: { style: tna.style }
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
            actualReceiveDate: true
            // omit createdAt, updatedAt
          }
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
            sampleQuantity: true
          }
        });

        return {
          ...tna,
          merchandiser: tna.merchandiser?.userName || null,
          buyerName: tna.buyer?.name || null,
          cad,
          fabricBooking, // will be null if not found
          sampleDevelopment, // will be null if not found
        };
      })
    );

    const cleaned = summary.map(({ buyer, ...rest }) => rest);
    res.json(cleaned);
  } catch (err) {
    console.error("getTNASummary error:", err);
    res.status(500).json({ error: err.message });
  }
}