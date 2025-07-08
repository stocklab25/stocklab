import { PrismaClient, StockTransaction, TransactionType } from '@prisma/client';

const prisma = new PrismaClient();

export interface CreateTransactionData {
  type: TransactionType;
  quantity: number;
  date: Date;
  fromLocation?: string;
  toLocation?: string;
  userId?: string;
  notes?: string;
  inventoryItemId?: string;
  productId: string;
}

export interface UpdateTransactionData {
  type?: TransactionType;
  quantity?: number;
  date?: Date;
  fromLocation?: string;
  toLocation?: string;
  userId?: string;
  notes?: string;
}

export interface TransactionFilters {
  type?: TransactionType;
  productId?: string;
  inventoryItemId?: string;
  userId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  showDeleted?: boolean;
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
}

export class TransactionService {
  /**
   * Create a new stock transaction
   */
  static async createTransaction(data: CreateTransactionData): Promise<StockTransaction> {
    return await prisma.stockTransaction.create({
      data: {
        type: data.type,
        quantity: data.quantity,
        date: data.date,
        fromLocation: data.fromLocation,
        toLocation: data.toLocation,
        userId: data.userId,
        notes: data.notes,
        inventoryItemId: data.inventoryItemId,
        productId: data.productId,
      },
      include: {
        product: true,
        InventoryItem: true,
        user: true,
      },
    });
  }

  /**
   * Create an IN transaction and update inventory quantity
   */
  static async createInTransaction(data: CreateTransactionData): Promise<StockTransaction> {
    return await prisma.$transaction(async (tx) => {
      // Create the transaction
      const transaction = await tx.stockTransaction.create({
        data: {
          type: 'IN',
          quantity: data.quantity,
          date: data.date,
          fromLocation: data.fromLocation,
          toLocation: data.toLocation,
          userId: data.userId,
          notes: data.notes,
          inventoryItemId: data.inventoryItemId,
          productId: data.productId,
        },
      });

      // Update inventory quantity if inventoryItemId is provided
      if (data.inventoryItemId) {
        await tx.inventoryItem.update({
          where: { id: data.inventoryItemId },
          data: {
            quantity: {
              increment: data.quantity
            }
          }
        });
      }

      return transaction;
    });
  }

  /**
   * Create an OUT transaction and update inventory quantity
   */
  static async createOutTransaction(data: CreateTransactionData): Promise<StockTransaction> {
    return await prisma.$transaction(async (tx) => {
      // Check if inventory item has enough quantity
      if (data.inventoryItemId) {
        const inventoryItem = await tx.inventoryItem.findUnique({
          where: { id: data.inventoryItemId }
        });

        if (!inventoryItem) {
          throw new Error('Inventory item not found');
        }

        if (inventoryItem.quantity < data.quantity) {
          throw new Error(`Insufficient stock. Available: ${inventoryItem.quantity}, Requested: ${data.quantity}`);
        }
      }

      // Create the transaction
      const transaction = await tx.stockTransaction.create({
        data: {
          type: 'OUT',
          quantity: data.quantity,
          date: data.date,
          fromLocation: data.fromLocation,
          toLocation: data.toLocation,
          userId: data.userId,
          notes: data.notes,
          inventoryItemId: data.inventoryItemId,
          productId: data.productId,
        },
      });

      // Update inventory quantity if inventoryItemId is provided
      if (data.inventoryItemId) {
        await tx.inventoryItem.update({
          where: { id: data.inventoryItemId },
          data: {
            quantity: {
              decrement: data.quantity
            }
          }
        });
      }

      return transaction;
    });
  }

  /**
   * Get transactions with filtering and pagination
   */
  static async getTransactions(
    filters: TransactionFilters = {},
    pagination: PaginationOptions = {}
  ): Promise<{ data: StockTransaction[]; total: number; pagination: any }> {
    const { page = 1, limit = 10 } = pagination;
    const skip = (page - 1) * limit;

    // Build where clause
    const whereClause: any = {};

    if (!filters.showDeleted) {
      whereClause.deletedAt = null;
    }

    if (filters.type) {
      whereClause.type = filters.type;
    }

    if (filters.productId) {
      whereClause.productId = filters.productId;
    }

    if (filters.inventoryItemId) {
      whereClause.inventoryItemId = filters.inventoryItemId;
    }

    if (filters.userId) {
      whereClause.userId = filters.userId;
    }

    if (filters.dateFrom || filters.dateTo) {
      whereClause.date = {};
      if (filters.dateFrom) {
        whereClause.date.gte = filters.dateFrom;
      }
      if (filters.dateTo) {
        whereClause.date.lte = filters.dateTo;
      }
    }

    const [transactions, total] = await Promise.all([
      prisma.stockTransaction.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { date: 'desc' },
        include: {
          product: true,
          InventoryItem: true,
          user: true,
        },
      }),
      prisma.stockTransaction.count({ where: whereClause }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: transactions,
      total,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  /**
   * Get a single transaction by ID
   */
  static async getTransactionById(id: string): Promise<StockTransaction | null> {
    return await prisma.stockTransaction.findFirst({
      where: { id, deletedAt: null },
      include: {
        product: true,
        InventoryItem: true,
        user: true,
      },
    });
  }

  /**
   * Update a transaction
   */
  static async updateTransaction(id: string, data: UpdateTransactionData): Promise<StockTransaction> {
    return await prisma.stockTransaction.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
      include: {
        product: true,
        InventoryItem: true,
        user: true,
      },
    });
  }

  /**
   * Soft delete a transaction
   */
  static async softDeleteTransaction(id: string): Promise<StockTransaction> {
    return await prisma.stockTransaction.update({
      where: { id },
      data: { 
        deletedAt: new Date(),
        updatedAt: new Date()
      }
    });
  }

  /**
   * Hard delete a transaction
   */
  static async hardDeleteTransaction(id: string): Promise<StockTransaction> {
    return await prisma.stockTransaction.delete({
      where: { id }
    });
  }

  /**
   * Get transactions by product ID
   */
  static async getTransactionsByProduct(productId: string): Promise<StockTransaction[]> {
    return await prisma.stockTransaction.findMany({
      where: { 
        productId,
        deletedAt: null 
      },
      orderBy: { date: 'desc' },
      include: {
        product: true,
        InventoryItem: true,
        user: true,
      },
    });
  }

  /**
   * Get transactions by inventory item ID
   */
  static async getTransactionsByInventoryItem(inventoryItemId: string): Promise<StockTransaction[]> {
    return await prisma.stockTransaction.findMany({
      where: { 
        inventoryItemId,
        deletedAt: null 
      },
      orderBy: { date: 'desc' },
      include: {
        product: true,
        InventoryItem: true,
        user: true,
      },
    });
  }

  /**
   * Get transactions by user ID
   */
  static async getTransactionsByUser(userId: string): Promise<StockTransaction[]> {
    return await prisma.stockTransaction.findMany({
      where: { 
        userId,
        deletedAt: null 
      },
      orderBy: { date: 'desc' },
      include: {
        product: true,
        InventoryItem: true,
        user: true,
      },
    });
  }

  /**
   * Get transactions by type
   */
  static async getTransactionsByType(type: TransactionType): Promise<StockTransaction[]> {
    return await prisma.stockTransaction.findMany({
      where: { 
        type,
        deletedAt: null 
      },
      orderBy: { date: 'desc' },
      include: {
        product: true,
        InventoryItem: true,
        user: true,
      },
    });
  }

  /**
   * Get transaction summary by date range
   */
  static async getTransactionSummary(dateFrom: Date, dateTo: Date): Promise<any> {
    const transactions = await prisma.stockTransaction.findMany({
      where: {
        date: {
          gte: dateFrom,
          lte: dateTo,
        },
        deletedAt: null,
      },
      include: {
        product: true,
        InventoryItem: true,
      },
    });

    const summary = {
      totalTransactions: transactions.length,
      byType: {} as Record<TransactionType, number>,
      totalValue: 0,
    };

    transactions.forEach(transaction => {
      // Count by type
      summary.byType[transaction.type] = (summary.byType[transaction.type] || 0) + 1;
      
      // Calculate value (assuming cost from inventory item or product)
      if (transaction.InventoryItem?.cost) {
        summary.totalValue += Number(transaction.InventoryItem.cost) * transaction.quantity;
      } else if (transaction.product?.cost) {
        summary.totalValue += Number(transaction.product.cost) * transaction.quantity;
      }
    });

    return summary;
  }

  /**
   * Get recent transactions
   */
  static async getRecentTransactions(limit: number = 10): Promise<StockTransaction[]> {
    return await prisma.stockTransaction.findMany({
      where: { deletedAt: null },
      orderBy: { date: 'desc' },
      take: limit,
      include: {
        product: true,
        InventoryItem: true,
        user: true,
      },
    });
  }
} 