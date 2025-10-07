export async function validateDates(sampleSendingDate, orderDate, res) {
  if (isNaN(Date.parse(sampleSendingDate)) || isNaN(Date.parse(orderDate))) {
    res.status(400).json({ error: "Invalid date format" });
    return false;
  }
  return true;
}

export async function validateBuyer(db, buyerId, res) {
  const [rows] = await db.query(
    "SELECT id FROM buyers WHERE id = ?",
    [buyerId]
  );
  if (rows.length === 0) {
    res.status(404).json({ error: "Buyer not found" });
    return false;
  }
  return true;
}

export async function validateUserRole(db, userId, role, res) {
  const [rows] = await db.query(
    "SELECT role FROM users WHERE id = ?",
    [userId]
  );
  if (rows.length === 0) {
    res.status(404).json({ error: "User not found" });
    return false;
  }
  if (rows[0].role !== role) {
    res.status(403).json({ error: `User must be a ${role}` });
    return false;
  }
  return true;
}

export function validateAuth(req, res) {
  if (!(req.user && req.user.id)) {
    res.status(400).json({ error: "User not authenticated. Cannot create TNA without createdById." });
    return false;
  }
  return true;
}

export async function isDhlTrackingComplete(res, db, style, shouldBeComplete = true) {
  try {
    const [rows] = await db.query(
      "SELECT isComplete FROM dhl_trackings WHERE style = ?",
      [style]
    );
    if (shouldBeComplete) {
      // Check if any tracking is complete
      const found = rows.some(row => row.isComplete === true || row.isComplete === 1);
      if (!found) {
        res.status(400).json({ error: "DHL tracking for this style is not complete." });
        return false;
      }
    } else {
      // Check if all trackings are incomplete
      const found = rows.every(row => row.isComplete === false || row.isComplete === 0);
      if (!found) {
        res.status(400).json({ error: "DHL tracking for this style is already complete." });
        return false;
      }
    }
    return true;
  } catch (error) {
    res.status(500).json({ error: "Error checking DHL tracking completion", details: error.message });
    return false;
  }
}

