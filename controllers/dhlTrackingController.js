export const createDHLTracking = async (req, res) => {
  try {
    const db = req.db;
    const { date, style, trackingNumber, isComplete } = req.body;

    if (!date || !style || !trackingNumber) {
      return res.status(400).json({ error: "date, style, and trackingNumber are required" });
    }

    const [result] = await db.query(
      "INSERT INTO dhl_trackings (date, style, trackingNumber, isComplete) VALUES (?, ?, ?, ?)",
      [new Date(date), style, trackingNumber, isComplete ?? false]
    );

    res.status(201).json({
      message: "DHL Tracking created successfully",
      data: { id: result.insertId, date, style, trackingNumber, isComplete: isComplete ?? false },
    });
  } catch (error) {
    console.error("Error creating DHL Tracking:", error);
    res.status(500).json({
      error: "Internal server error",
      details: error.message,
    });
  }
};
