export const createCadApproval = async (req, res) => {
  try {
    const { style, fileReceiveDate, completeDate, cadMasterName } = req.body;

    if (!style || !fileReceiveDate || !completeDate) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const cadApproval = await req.db.query(
      `INSERT INTO cad_designs (style, fileReceiveDate, completeDate, CadMasterName, createdById)
       VALUES (?, ?, ?, ?, ?)
       RETURNING *`,
      [style, new Date(fileReceiveDate), new Date(completeDate), cadMasterName || null, req.user.id]
    );
    res.status(201).json({ message: 'CAD Approval created successfully', data: cadApproval[0] });
  } catch (error) {
    console.error('Error creating CAD Approval:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};

export const getCadApproval = async (req, res) => {
  try {
    const db = req.db;
    const { page = 1, pageSize = 10, search, startDate, endDate } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(pageSize);
    const take = parseInt(pageSize);

    // Build where clause
    let whereClause = "WHERE createdById = ?";
    const params = [req.user.id];

    if (search) {
      whereClause += " AND (style LIKE ? OR CadMasterName LIKE ?)";
      params.push(`%${search}%`, `%${search}%`);
    }
    if (startDate && endDate) {
      whereClause += " AND fileReceiveDate BETWEEN ? AND ?";
      params.push(new Date(startDate), new Date(endDate));
    } else if (startDate) {
      whereClause += " AND fileReceiveDate >= ?";
      params.push(new Date(startDate));
    } else if (endDate) {
      whereClause += " AND fileReceiveDate <= ?";
      params.push(new Date(endDate));
    }

    const [cadApprovals] = await db.query(
      `SELECT * FROM cad_designs ${whereClause}
       ORDER BY createdAt DESC
       LIMIT ? OFFSET ?`,
      [...params, take, skip]
    );

    const [totalResult] = await db.query(
      `SELECT COUNT(*) as total FROM cad_designs ${whereClause}`,
      params
    );
    const total = totalResult[0] ? totalResult[0].total : 0;

    res.json({
      data: cadApprovals,
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      total,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error('Error fetching CAD Approvals:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};

export const updateCadDesign = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      style,
      fileReceiveDate,
      completeDate,
      CadMasterName,
      finalFileReceivedDate,
      finalCompleteDate,
    } = req.body;

    const updatedCad = await req.db.query(
      `UPDATE cad_designs SET
         ${style ? 'style = ?,' : ''}
         ${fileReceiveDate ? 'fileReceiveDate = ?,' : ''}
         ${completeDate ? 'completeDate = ?,' : ''}
         ${CadMasterName !== undefined ? 'CadMasterName = ?,' : ''}
         ${finalFileReceivedDate ? 'finalFileReceivedDate = ?,' : ''}
         ${finalCompleteDate ? 'finalCompleteDate = ?,' : ''}
         updatedAt = ?
       WHERE id = ?
       RETURNING *`,
      [
        ...(style ? [style] : []),
        ...(fileReceiveDate ? [new Date(fileReceiveDate)] : []),
        ...(completeDate ? [new Date(completeDate)] : []),
        ...(CadMasterName !== undefined ? [CadMasterName] : []),
        ...(finalFileReceivedDate ? [new Date(finalFileReceivedDate)] : []),
        ...(finalCompleteDate ? [new Date(finalCompleteDate)] : []),
        new Date(),
        id,
      ]
    );

    res.json({ message: 'CAD Design updated successfully', data: updatedCad[0] });
  } catch (error) {
    console.error('Error updating CAD Design:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};

export const deleteCadDesign = async (req, res) => {
  try {
    const { id } = req.params;
    await req.db.query(`DELETE FROM cad_designs WHERE id = ?`, [id]);
    res.json({ message: 'CAD Design deleted successfully' });
  } catch (error) {
    console.error('Error deleting CAD Design:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};