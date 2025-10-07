import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const createSampleDevelopment = async (req, res) => {
  try {
    const {
      style,
      samplemanName,
      sampleReceiveDate,
      sampleCompleteDate,
      sampleQuantity,
    } = req.body;

    // Validate required fields
    if (
      !style ||
      !samplemanName ||
      !sampleReceiveDate ||
      !sampleCompleteDate ||
      sampleQuantity === undefined
    ) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const sampleDevelopment = await prisma.sampleDevelopment.create({
      data: {
        style,
        samplemanName,
        sampleReceiveDate: new Date(sampleReceiveDate),
        sampleCompleteDate: new Date(sampleCompleteDate),
        sampleQuantity: Number(sampleQuantity),
        createdBy: { connect: { id: req.user.id } },
      },
    });

    res.status(201).json({
      message: 'Sample Development created successfully',
      data: sampleDevelopment,
    });
  } catch (error) {
    console.error('Error creating Sample Development:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error.message,
    });
  }
};

// Get SampleDevelopment with pagination
export const getSampleDevelopment = async (req, res) => {
  try {
    const { page = 1, pageSize = 10, search, startDate, endDate } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(pageSize);
    const take = parseInt(pageSize);

    // Build where clause
    const where = {
      // Only return cad approvals created by the current user
      createdById: req.user && req.user.id ? req.user.id : undefined,
    };

    // Search by style or CadMasterName (case-insensitive)
    if (search) {
      where.OR = [
        { style: { contains: search } }
      ];
    }

    // Filter by sampleReceiveDate range
    if (startDate && endDate) {
      where.sampleReceiveDate = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    } else if (startDate) {
      where.sampleReceiveDate = {
        gte: new Date(startDate),
      };
    } else if (endDate) {
      where.sampleReceiveDate = {
        lte: new Date(endDate),
      };
    }

    const [sampleDevelopments, total] = await Promise.all([
      prisma.sampleDevelopment.findMany({
        skip,
        take,
        where, 
        orderBy: { createdAt: 'desc' },
      }),
      prisma.sampleDevelopment.count({ where }),
    ]);

    res.json({
      data: sampleDevelopments,
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      total,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error('Error fetching Sample Developments:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error.message,
    });
  }
};

// Update SampleDevelopment by ID
export const updateSampleDevelopment = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      style,
      samplemanName,
      sampleReceiveDate,
      sampleCompleteDate,
      actualSampleReceiveDate,
      actualSampleCompleteDate,
      sampleQuantity,
    } = req.body;
console.log("Updating Sample Development ID:", id, "with data:", req.body);
    // Build update data object only with provided fields
    const data = {};
    if (style !== undefined) data.style = style;
    if (samplemanName !== undefined) data.samplemanName = samplemanName;
    if (sampleReceiveDate !== undefined)
      data.sampleReceiveDate = new Date(sampleReceiveDate);
    if (sampleCompleteDate !== undefined)
      data.sampleCompleteDate = new Date(sampleCompleteDate);
    if (actualSampleReceiveDate !== undefined)
      data.actualSampleReceiveDate = actualSampleReceiveDate
        ? new Date(actualSampleReceiveDate)
        : null;
    if (actualSampleCompleteDate !== undefined)
      data.actualSampleCompleteDate = actualSampleCompleteDate
        ? new Date(actualSampleCompleteDate)
        : null;
    if (sampleQuantity !== undefined) data.sampleQuantity = Number(sampleQuantity);

    const updated = await prisma.sampleDevelopment.update({
      where: { id },
      data,
    });

    res.json({
      message: 'Sample Development updated successfully',
      data: updated,
    });
  } catch (error) {
    console.error('Error updating Sample Development:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error.message,
    });
  }
};

// Delete SampleDevelopment by ID
export const deleteSampleDevelopment = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.sampleDevelopment.delete({
      where: { id },
    });
    res.json({ message: 'Sample Development deleted successfully' });
  } catch (error) {
    console.error('Error deleting Sample Development:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error.message,
    });
  }
};