// Remove: import { PrismaClient } from "@prisma/client";
// Use req.user or db queries as needed
export const checkAdmin = async (user) => {
  if (!user || user.role !== 'ADMIN') {
    throw new Error('Unauthorized: Only admins can perform this action');
  }
  return true;
};