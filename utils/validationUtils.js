export async function validateDates(sampleSendingDate, orderDate, res) {
  if (isNaN(Date.parse(sampleSendingDate)) || isNaN(Date.parse(orderDate))) {
    res.status(400).json({ error: "Invalid date format" });
    return false;
  }
  return true;
}

export async function validateBuyer(prisma, buyerId, res) {
  const idInt = parseInt(buyerId, 10);
  const buyerExists = await prisma.buyer.findUnique({
    where: { id: idInt },
  });
  if (!buyerExists) {
    res.status(404).json({ error: "Buyer not found" });
    return false;
  }
  return true;
}

export async function validateUserRole(prisma, userId, role, res) {
  const idInt = parseInt(userId, 10);
  const userExists = await prisma.user.findUnique({
    where: { id: idInt },
  });
  if (!userExists) {
    res.status(404).json({ error: "User not found" });
    return false;
  }
  if (userExists.role !== role) {
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

export async function isDhlTrackingComplete(res, prisma, style, shouldBeComplete = true) {
  try {
    const trackings = await prisma.dHLTracking.findMany({
      where: { style }
    });

    if (shouldBeComplete) {
      // Check if any tracking is complete
      const found = trackings.some(row => row.isComplete === true);
      if (!found) {
        res.status(400).json({ error: "DHL tracking for this style is not complete." });
        return false;
      }
    } else {
      // Check if all trackings are incomplete
      const found = trackings.every(row => row.isComplete === false);
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