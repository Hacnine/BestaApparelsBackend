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

// Add getFabricBooking with pagination
export const getFabricBooking = async (req, res) => {
  try {
    // Fix: The model name in Prisma schema is FabricBooking, so use prisma.fabricBooking not prisma.fabricbooking
    // If you get "undefined", check your Prisma client generation and model name spelling/casing.
    if (!prisma.fabricBooking) {
      throw new Error("prisma.fabricBooking is undefined. Check your Prisma schema/model and regenerate the client.");
    }

    const { page = 1, pageSize = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(pageSize);
    const take = parseInt(pageSize);

    const [fabricBookings, total] = await Promise.all([
      prisma.fabricBooking.findMany({
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.fabricBooking.count(),
    ]);

    res.json({
      data: fabricBookings,
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      total,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error('Error fetching Fabric Bookings:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error.message,
    });
  }
};