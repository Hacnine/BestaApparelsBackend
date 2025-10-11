import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export const getAllCostSheets = async (req, res) => {
  try {
    const costSheets = await prisma.costSheet.findMany({
      include: { style: true, createdBy: true },
    });
    res.json(costSheets);
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
      const creatorName = styleRecord.costSheets[0].createdBy?.userName || "";
      return res.json({ exists: true, creatorName });
    }
    return res.json({ exists: false });
  } catch (error) {
    res.status(500).json({ error: "Failed to check style" });
  }
};

export const createCostSheet = async (req, res) => {
  try {
    const data = req.body;
    // Find or create style
    let style = await prisma.style.findFirst({ where: { name: data.style } });
    if (!style) {
      style = await prisma.style.create({ data: { name: data.style } });
    }
  

    // Ensure all JSON fields are present
    const cadRows = data.cadConsumption ?? {};
    const fabricRows = data.fabricCost ?? {};
    const trimsRows = data.trimsAccessories ?? {};
    const othersRows = data.others ?? {};
    const summaryRows = data.summary ?? {};

    const costSheet = await prisma.costSheet.create({
      data: {
        styleId: style.id,
        createdById: { connect: { id: req.user.id } },
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
