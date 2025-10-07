export const createFabricBooking = async (req, res) => {
  try {
    const { style, bookingDate, receiveDate } = req.body;
    if (!style || !bookingDate || !receiveDate) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const fabricBooking = await req.db.query(
      `INSERT INTO fabric_bookings (style, bookingDate, receiveDate, createdById)
       VALUES (?, ?, ?, ?)
       RETURNING *`,
      [style, new Date(bookingDate), new Date(receiveDate), req.user.id]
    );
    res.status(201).json({
      message: 'Fabric Booking created successfully',
      data: fabricBooking[0],
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
    const db = req.db;
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

    // Filter by bookingDate range
    if (startDate && endDate) {
      where.bookingDate = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    } else if (startDate) {
      where.bookingDate = {
        gte: new Date(startDate),
      };
    } else if (endDate) {
      where.bookingDate = {
        lte: new Date(endDate),
      };
    }
    const [fabricBookings] = await db.query(
      `SELECT * FROM fabric_bookings
       WHERE createdById = ?
       ${search ? 'AND style LIKE ?' : ''}
       ${startDate && endDate ? 'AND bookingDate BETWEEN ? AND ?' : ''}
       ORDER BY createdAt DESC
       LIMIT ? OFFSET ?`,
      [
        req.user.id,
        search ? `%${search}%` : undefined,
        startDate ? new Date(startDate) : undefined,
        endDate ? new Date(endDate) : undefined,
        take,
        skip,
      ].filter((v) => v !== undefined)
    );

    const [countRows] = await db.query(
      `SELECT COUNT(*) as count FROM fabric_bookings
       WHERE createdById = ?
       ${search ? 'AND style LIKE ?' : ''}
       ${startDate && endDate ? 'AND bookingDate BETWEEN ? AND ?' : ''}`,
      [
        req.user.id,
        search ? `%${search}%` : undefined,
        startDate ? new Date(startDate) : undefined,
        endDate ? new Date(endDate) : undefined,
      ].filter((v) => v !== undefined)
    );

    res.json({
      data: fabricBookings,
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      total: countRows[0].count,
      totalPages: Math.ceil(countRows[0].count / pageSize),
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

    const updated = await req.db.query(
      `UPDATE fabric_bookings SET
         style = ?,
         bookingDate = ?,
         receiveDate = ?,
         actualBookingDate = ?,
         actualReceiveDate = ?
       WHERE id = ?
       RETURNING *`,
      [
        data.style,
        data.bookingDate,
        data.receiveDate,
        data.actualBookingDate,
        data.actualReceiveDate,
        id,
      ]
    );

    res.json({
      message: "Fabric Booking updated successfully",
      data: updated[0],
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
    await req.db.query(
      `DELETE FROM fabric_bookings WHERE id = ?`,
      [id]
    );
    res.json({ message: "Fabric Booking deleted successfully" });
  } catch (error) {
    console.error("Error deleting Fabric Booking:", error);
    res.status(500).json({
      error: "Internal server error",
      details: error.message,
    });
  }
};