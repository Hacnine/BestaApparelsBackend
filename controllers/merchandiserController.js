export const createDepartment = async (req, res) => {
  try {
    const { name, contactPerson } = req.body;

    // Validate required fields
    if (!name || !contactPerson) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const db = req.db;
    // Create department
    const result = await db.query(
      "INSERT INTO departments (name, contactPerson) VALUES (?, ?)",
      [name, contactPerson]
    );

    const departmentId = result[0]?.insertId;

    res.status(201).json({
      message: "Department created successfully",
      data: { id: departmentId, name, contactPerson },
    });
  } catch (error) {
    console.error("Error creating department:", error);
    res.status(500).json({
      error: "Internal server error",
      details: error.message,
    });
  }
};

export const getDepartments = async (req, res) => {
  try {
    const db = req.db;
    const [departments] = await db.query(
      "SELECT id, name, contactPerson FROM departments"
    );

    res.status(200).json({ data: departments });
  } catch (error) {
    console.error("Error fetching departments:", error);
    res.status(500).json({
      error: "Internal server error",
      details: error.message,
    });
  }
};

export const getMerchandisers = async (req, res) => {
  try {
    const db = req.db;
    const [merchandisers] = await db.query(
      `SELECT u.id, u.name, u.email, e.status
       FROM users u
       JOIN employees e ON u.id = e.userId
       WHERE u.role = 'MERCHANDISER' AND e.status = 'ACTIVE'`
    );

    // Remove password from each user object
    const result = merchandisers.map(({ password, ...user }) => user);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};




