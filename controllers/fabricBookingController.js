import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const createFabricBooking = async (req, res) => {
  try {
    const { style, bookingDate, receiveDate } = req.body;
    if (!style || !bookingDate || !receiveDate) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const fabricBooking = await prisma.fabricBooking.create({
      data: {
        style,
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
    const { page = 1, pageSize = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(pageSize);
    const take = parseInt(pageSize);

    // Debug: Fetch all records without pagination to check if any data exists
    const allRecords = await prisma.fabricBooking.findMany();
    console.log('All FabricBooking records in DB:', allRecords);

    // Debug: Fetch paginated records
    const [fabricBookings, total] = await Promise.all([
      prisma.fabricBooking.findMany({
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.fabricBooking.count(),
    ]);
    console.log('Paginated FabricBookings:', fabricBookings);

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

// Update FabricBooking by ID
export const updateFabricBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      style,
      bookingDate,
      receiveDate,
      actualBookingDate,
      actualReceiveDate,
    } = req.body;

    const data = {};
    if (style !== undefined) data.style = style;
    if (bookingDate !== undefined) data.bookingDate = new Date(bookingDate);
    if (receiveDate !== undefined) data.receiveDate = new Date(receiveDate);
    if (actualBookingDate !== undefined)
      data.actualBookingDate = actualBookingDate ? new Date(actualBookingDate) : null;
    if (actualReceiveDate !== undefined)
      data.actualReceiveDate = actualReceiveDate ? new Date(actualReceiveDate) : null;

    const updated = await prisma.fabricBooking.update({
      where: { id },
      data,
    });

    res.json({
      message: "Fabric Booking updated successfully",
      data: updated,
    });
  } catch (error) {
    console.error("Error updating Fabric Booking:", error);
    res.status(500).json({
      error: "Internal server error",
      details: error.message,
    });
  }
};

// Delete FabricBooking by ID
export const deleteFabricBooking = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.fabricBooking.delete({
      where: { id },
    });
    res.json({ message: "Fabric Booking deleted successfully" });
  } catch (error) {
    console.error("Error deleting Fabric Booking:", error);
    res.status(500).json({
      error: "Internal server error",
      details: error.message,
    });
  }
};