import { checkAdmin } from "../utils/userControllerUtils.js";

export const createEmployee = async (req, res) => {
  try {
    await checkAdmin(req.user);
    const employeeData = req.body;
    const db = req.db;
    const result = await db.query(
      `INSERT INTO employees (customId, name, phoneNumber, email, status, designation, department)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       RETURNING *`,
      [employeeData.customId, employeeData.name, employeeData.phoneNumber, employeeData.email, employeeData.status || "ACTIVE", employeeData.designation, employeeData.department]
    );
    const employee = result[0];
    return res.status(201).json({ message: "Employee created successfully", employee });
  } catch (error) {
     // Handle SQL unique constraint error for duplicate customId
    if (error.code === "ER_DUP_ENTRY" && error.message.includes("customId")) {
      return res.status(400).json({ message: "Custom ID already exists, please choose another." });
    }
    console.error('Error creating employee:', error);
    res.status(500).json({ success: false, message: 'Error creating employee', error: error.message });
  }
}

export const getEmployees = async (req, res) => {
  try {
    const db = req.db;
    const page = parseInt(req.query.page) || 1;
    const limit = 20; 
    const search = req.query.search || ''; 
    const skip = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const queryParams = [];

    if (search) {
      whereClause += ` AND (customId LIKE ? OR email LIKE ? OR department LIKE ? OR designation LIKE ?)`;
      const likeSearch = `%${search}%`;
      queryParams.push(likeSearch, likeSearch, likeSearch, likeSearch);
    }

    const employees = await db.query(
      `SELECT * FROM employees ${whereClause} ORDER BY customId ASC LIMIT ? OFFSET ?`,
      [...queryParams, limit, skip]
    );

    // Get total count (with search applied for accurate pagination)
    const totalResult = await db.query(
      `SELECT COUNT(*) as total FROM employees ${whereClause}`,
      queryParams
    );
    const totalEmployees = totalResult[0]?.total || 0;

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalEmployees / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    res.status(200).json({
      success: true,
      data: employees,
      pagination: {
        currentPage: page,
        totalPages: totalPages,
        totalEmployees: totalEmployees,
        limit: limit,
        hasNextPage: hasNextPage,
        hasPrevPage: hasPrevPage,
        search: search || null, // Include search term in response for UI
      },
    });
  } catch (error) {
    console.error('Error fetching employees:', error);
    res.status(500).json({ success: false, message: 'Error fetching employees', error: error.message });
  }
};

export const updateEmployeeStatus = async (req, res) => {
  try {
    const db = req.db;
    const { id } = req.params; 
    const { status } = req.body; 

    if (!['ACTIVE', 'INACTIVE'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status. Must be ACTIVE or INACTIVE.' });
    }

    const result = await db.query(
      `UPDATE employees SET status = ? WHERE id = ? RETURNING *`,
      [status, id]
    );

    const updatedEmployee = result[0];

    if (!updatedEmployee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    res.status(200).json({
      success: true,
      data: updatedEmployee,
      message: `Employee status updated to ${status}`,
    });
  } catch (error) {
    console.error('Error updating employee status:', error);
    res.status(500).json({ success: false, message: 'Error updating employee status', error: error.message });
  }
};