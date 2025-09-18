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