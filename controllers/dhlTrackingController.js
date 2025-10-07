import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const createDHLTracking = async (req, res) => {
  try {
    const { date, style, trackingNumber, isComplete } = req.body;

    if (!date || !style || !trackingNumber) {
      return res.status(400).json({ error: "date, style, and trackingNumber are required" });
    }

    const dhlTracking = await prisma.dHLTracking.create({
      data: {
        date: new Date(date),
        style,
        trackingNumber,
        isComplete: isComplete ?? false,
      },
    });

    res.status(201).json({
      message: "DHL Tracking created successfully",
      data: dhlTracking,
    });
  } catch (error) {
    console.error("Error creating DHL Tracking:", error);
    res.status(500).json({
      error: "Internal server error",
      details: error.message,
    });
  }
};
