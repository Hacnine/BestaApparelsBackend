import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const createFabricBooking = async (req, res) => {
  try {
    const { fabricStyle, bookingDate, receiveDate } = req.body;
    if (!fabricStyle || !bookingDate || !receiveDate) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const fabricBooking = await prisma.fabricBooking.create({
      data: {
        fabricStyle,
        bookingDate: new Date(bookingDate),
        receiveDate: new Date(receiveDate),
      },
    });
    res.status(201).json({
      message: 'Fabric Booking created successfully',
      data: fabricBooking,
    });
  } catch (error) {
    console.error('Error creating Fabric Booking:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error.message,
    });
  }
};