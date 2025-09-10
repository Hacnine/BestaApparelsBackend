import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const checkAdmin = async (user) => {
  if (!user || user.role !== 'ADMIN') {
    throw new Error('Unauthorized: Only admins can perform this action');
  }
  else{
    return true;
  }
};