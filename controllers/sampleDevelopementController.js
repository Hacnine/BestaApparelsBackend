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

    const db = req.db;
    const [result] = await db.query(
      `INSERT INTO sample_developments (style, samplemanName, sampleReceiveDate, sampleCompleteDate, sampleQuantity, createdById)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        style,
        samplemanName,
        new Date(sampleReceiveDate),
        new Date(sampleCompleteDate),
        Number(sampleQuantity),
        req.user.id
      ]
    );

    const insertedId = result.insertId;
    const [rows] = await db.query(
      `SELECT * FROM sample_developments WHERE id = ?`,
      [insertedId]
    );

    res.status(201).json({
      message: 'Sample Development created successfully',
      data: rows[0],
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
    const db = req.db;
    const { page = 1, pageSize = 10, search, startDate, endDate } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(pageSize);
    const take = parseInt(pageSize);

    let whereClause = 'WHERE createdById = ?';
    const params = [req.user.id];

    if (search) {
      whereClause += ' AND style LIKE ?';
      params.push(`%${search}%`);
    }
    if (startDate && endDate) {
      whereClause += ' AND sampleReceiveDate BETWEEN ? AND ?';
      params.push(new Date(startDate), new Date(endDate));
    } else if (startDate) {
      whereClause += ' AND sampleReceiveDate >= ?';
      params.push(new Date(startDate));
    } else if (endDate) {
      whereClause += ' AND sampleReceiveDate <= ?';
      params.push(new Date(endDate));
    }

    const [sampleDevelopments] = await db.query(
      `SELECT * FROM sample_developments ${whereClause} ORDER BY createdAt DESC LIMIT ? OFFSET ?`,
      [...params, take, skip]
    );

    const [countRows] = await db.query(
      `SELECT COUNT(*) as total FROM sample_developments ${whereClause}`,
      params
    );
    const total = countRows[0]?.total || 0;

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
    const db = req.db;
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
    // Build update fields and params
    const fields = [];
    const params = [];
    if (style !== undefined) { fields.push('style = ?'); params.push(style); }
    if (samplemanName !== undefined) { fields.push('samplemanName = ?'); params.push(samplemanName); }
    if (sampleReceiveDate !== undefined) { fields.push('sampleReceiveDate = ?'); params.push(new Date(sampleReceiveDate)); }
    if (sampleCompleteDate !== undefined) { fields.push('sampleCompleteDate = ?'); params.push(new Date(sampleCompleteDate)); }
    if (actualSampleReceiveDate !== undefined) { fields.push('actualSampleReceiveDate = ?'); params.push(actualSampleReceiveDate ? new Date(actualSampleReceiveDate) : null); }
    if (actualSampleCompleteDate !== undefined) { fields.push('actualSampleCompleteDate = ?'); params.push(actualSampleCompleteDate ? new Date(actualSampleCompleteDate) : null); }
    if (sampleQuantity !== undefined) { fields.push('sampleQuantity = ?'); params.push(Number(sampleQuantity)); }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No fields provided for update.' });
    }

    params.push(id);

    await db.query(
      `UPDATE sample_developments SET ${fields.join(', ')} WHERE id = ?`,
      params
    );

    const [updatedRows] = await db.query(
      `SELECT * FROM sample_developments WHERE id = ?`,
      [id]
    );

    res.json({
      message: 'Sample Development updated successfully',
      data: updatedRows[0],
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
    const db = req.db;
    const { id } = req.params;
    await db.query(
      `DELETE FROM sample_developments WHERE id = ?`,
      [id]
    );
    res.json({ message: 'Sample Development deleted successfully' });
  } catch (error) {
    console.error('Error deleting Sample Development:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error.message,
    });
  }
};