import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const createCadApproval = async (req, res) => {
  try {
    const { style, fileReceiveDate, completeDate, cadMasterName } = req.body;
    console.log(req.body);
    if (!style || !fileReceiveDate || !completeDate) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const cadApproval = await prisma.cadDesign.create({
      data: {
        style,
        fileReceiveDate: new Date(fileReceiveDate),
        completeDate: new Date(completeDate),
        CadMasterName: cadMasterName || null,
      },
    });
    res.status(201).json({ message: 'CAD Approval created successfully', data: cadApproval });
  } catch (error) {
    console.error('Error creating CAD Approval:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};

export const getCadApproval = async (req, res) => {
  try {
    const { page = 1, pageSize = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(pageSize);
    const take = parseInt(pageSize);

    const [cadApprovals, total] = await Promise.all([
      prisma.cadDesign.findMany({
        skip,
        take,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.cadDesign.count()
    ]);

    res.json({
      data: cadApprovals,
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      total,
      totalPages: Math.ceil(total / pageSize)
    });
  } catch (error) {
    console.error('Error fetching CAD Approvals:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};