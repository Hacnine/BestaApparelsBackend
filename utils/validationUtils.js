export async function validateDates(sampleSendingDate, orderDate, res) {
  if (isNaN(Date.parse(sampleSendingDate)) || isNaN(Date.parse(orderDate))) {
    res.status(400).json({ error: "Invalid date format" });
    return false;
  }
  return true;
}

export async function validateBuyer(prisma, buyerId, res) {
  const buyerExists = await prisma.buyer.findUnique({
    where: { id: buyerId },
  });
  if (!buyerExists) {
    res.status(404).json({ error: "Buyer not found" });
    return false;
  }
  return true;
}

export async function validateUserRole(prisma, userId, role, res) {
  const userExists = await prisma.user.findUnique({
    where: { id: userId },
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
