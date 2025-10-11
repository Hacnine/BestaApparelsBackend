import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export const getAllCostSheets = async (req, res) => {
  try {
    const costSheets = await prisma.costSheet.findMany({
      include: { style: true, createdBy: true },
    });
    // Remove password from createdBy
    const sanitized = costSheets.map((cs) => ({
      ...cs,
      createdBy: cs.createdBy ? { ...cs.createdBy, password: undefined } : cs.createdBy,
    }));
    res.json(sanitized);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch cost sheets" });
  }
};

export const getCostSheetById = async (req, res) => {
  try {
    const { id } = req.params;
    const costSheet = await prisma.costSheet.findUnique({
      where: { id: Number(id) },
      include: { style: true, createdBy: true },
    });
    if (!costSheet) return res.status(404).json({ error: "Not found" });
    // Remove password from createdBy
    if (costSheet.createdBy) costSheet.createdBy.password = undefined;
    res.json(costSheet);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch cost sheet" });
  }
};

export const checkStyle = async (req, res) => {
  try {
    const { style } = req.query;

    if (!style) return res.status(400).json({ error: "Style is required" });
    const styleRecord = await prisma.style.findFirst({
      where: { name: String(style) },
      include: { costSheets: { include: { createdBy: true } } },
    });
    if (styleRecord && styleRecord.costSheets.length > 0) {
      const creator = styleRecord.costSheets[0].createdBy;
      const creatorName = creator?.userName || "";
      // Remove password from creator
      if (creator) creator.password = undefined;
      return res.json({ exists: true, creatorName });
    }
    else {
      return res.json({ exists: false });
    }
  } catch (error) {
    res.status(500).json({ error: "Failed to check style" });
  }
};

export const createCostSheet = async (req, res) => {
  try {
    const data = req.body;
    // Convert style to lowercase for letters only
    const normalizedStyle = typeof data.style === "string"
      ? data.style.replace(/[A-Za-z]+/g, match => match.toLowerCase())
      : data.style;

    // Find or create style
    let style = await prisma.style.findFirst({ where: { name: normalizedStyle } });
    if (!style) {
      style = await prisma.style.create({ data: { name: normalizedStyle } });
    }

    // Ensure all JSON fields are present
    const cadRows = data.cadConsumption ?? {};
    const fabricRows = data.fabricCost ?? {};
    const trimsRows = data.trimsAccessories ?? {};
    const othersRows = data.others ?? {};
    const summaryRows = data.summary ?? {};

    // Save all required fields from frontend
    const costSheet = await prisma.costSheet.create({
      data: {
        styleId: style.id,
        item: data.item,
        group: data.group,
        size: data.size,
        fabricType: data.fabricType,
        gsm: data.gsm,
        color: data.color,
        quantity: Number(data.qty) || 0,
        createdById: req.user.id,
        cadRows,
        fabricRows,
        trimsRows,
        othersRows,
        summaryRows,
      },
    });
    res.status(201).json(costSheet);
  } catch (error) {
    console.error("Create CostSheet Error:", error);
    console.error("Incoming Data:", req.body);
    res.status(500).json({ error: "Failed to create cost sheet", details: error.message });
  }
};

export const updateCostSheet = async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    const costSheet = await prisma.costSheet.update({
      where: { id: Number(id) },
      data,
    });
    res.json(costSheet);
  } catch (error) {
    res.status(500).json({ error: "Failed to update cost sheet" });
  }
};

export const deleteCostSheet = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.costSheet.delete({ where: { id: Number(id) } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete cost sheet" });
  }
};
