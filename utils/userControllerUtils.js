import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const checkAdmin = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });
  if (!user || user.role !== 'ADMIN') {
    throw new Error('Unauthorized: Only admins can perform this action');
  }
};