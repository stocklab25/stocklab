import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Soft delete helper functions
export const softDeleteProduct = async (id: string) => {
  return await prisma.product.update({
    where: { id },
    data: { 
      deletedAt: new Date(),
      updatedAt: new Date()
    }
  });
};

export const softDeleteInventoryItem = async (id: string) => {
  return await prisma.inventoryItem.update({
    where: { id },
    data: { 
      deletedAt: new Date(),
      updatedAt: new Date()
    }
  });
};

export const softDeleteTransaction = async (id: string) => {
  return await prisma.stockTransaction.update({
    where: { id },
    data: { 
      deletedAt: new Date(),
      updatedAt: new Date()
    }
  });
};

export const softDeleteUser = async (id: string) => {
  return await prisma.user.update({
    where: { id },
    data: { 
      deletedAt: new Date(),
      updatedAt: new Date()
    }
  });
};

// Restore helper functions
export const restoreProduct = async (id: string) => {
  return await prisma.product.update({
    where: { id },
    data: { 
      deletedAt: null,
      updatedAt: new Date()
    }
  });
};

export const restoreInventoryItem = async (id: string) => {
  return await prisma.inventoryItem.update({
    where: { id },
    data: { 
      deletedAt: null,
      updatedAt: new Date()
    }
  });
};

export const restoreTransaction = async (id: string) => {
  return await prisma.stockTransaction.update({
    where: { id },
    data: { 
      deletedAt: null,
      updatedAt: new Date()
    }
  });
};

export const restoreUser = async (id: string) => {
  return await prisma.user.update({
    where: { id },
    data: { 
      deletedAt: null,
      updatedAt: new Date()
    }
  });
};

// Common query filters
export const notDeletedFilter = {
  deletedAt: null
};

export const notDeletedProductFilter = {
  product: {
    deletedAt: null
  }
};

export default prisma; 