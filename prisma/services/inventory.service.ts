import { PrismaClient, InventoryItem, InventoryStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

export interface CreateInventoryItemData {
  productId: string;
  sku: string;
  size: string;
  condition: string;
  cost: number;
  payout: number;
  consigner: string;
  consignDate: Date;
  status?: InventoryStatus;
  location?: string;
  quantity?: number;
}

export interface UpdateInventoryItemData {
  sku?: string;
  size?: string;
  condition?: string;
  cost?: number;
  payout?: number;
  consigner?: string;
  consignDate?: Date;
  status?: InventoryStatus;
  location?: string;
  quantity?: number;
}

export interface InventoryFilters {
  productId?: string;
  status?: InventoryStatus;
  size?: string;
  condition?: string;
  consigner?: string;
  showDeleted?: boolean;
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
}

export class InventoryService {
  /**
   * Create a new inventory item
   */
  static async createInventoryItem(data: CreateInventoryItemData): Promise<InventoryItem> {
    // Check if SKU is unique (if provided)
    if (data.sku) {
      const existingItem = await prisma.inventoryItem.findFirst({
        where: {
          sku: data.sku,
          deletedAt: null,
        },
      });

      if (existingItem) {
        throw new Error('SKU already exists');
      }
    }

    return await prisma.inventoryItem.create({
      data: {
        productId: data.productId,
        sku: data.sku,
        size: data.size,
        condition: data.condition,
        cost: new Decimal(data.cost),
        payout: new Decimal(data.payout),
        consigner: data.consigner,
        consignDate: data.consignDate,
        status: data.status || InventoryStatus.InStock,
        location: data.location,
        quantity: data.quantity || 1,
      },
      include: {
        product: true,
      },
    });
  }

  /**
   * Get inventory items with filtering and pagination
   */
  static async getInventoryItems(
    filters: InventoryFilters = {},
    pagination: PaginationOptions = {}
  ): Promise<{ data: InventoryItem[]; total: number; pagination: any }> {
    const { page = 1, limit = 10 } = pagination;
    const skip = (page - 1) * limit;

    // Build where clause
    const whereClause: any = {};

    if (!filters.showDeleted) {
      whereClause.deletedAt = null;
    }

    if (filters.productId) {
      whereClause.productId = filters.productId;
    }

    if (filters.status) {
      whereClause.status = filters.status;
    }

    if (filters.size) {
      whereClause.size = { contains: filters.size, mode: 'insensitive' };
    }

    if (filters.condition) {
      whereClause.condition = { contains: filters.condition, mode: 'insensitive' };
    }

    if (filters.consigner) {
      whereClause.consigner = { contains: filters.consigner, mode: 'insensitive' };
    }

    const [inventoryItems, total] = await Promise.all([
      prisma.inventoryItem.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          product: true,
        },
      }),
      prisma.inventoryItem.count({ where: whereClause }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: inventoryItems,
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
   * Get a single inventory item by ID
   */
  static async getInventoryItemById(id: string): Promise<InventoryItem | null> {
    return await prisma.inventoryItem.findFirst({
      where: { id, deletedAt: null },
      include: {
        product: true,
      },
    });
  }

  /**
   * Update an inventory item
   */
  static async updateInventoryItem(id: string, data: UpdateInventoryItemData): Promise<InventoryItem> {
    // Check if SKU is unique (if provided)
    if (data.sku) {
      const existingItem = await prisma.inventoryItem.findFirst({
        where: {
          sku: data.sku,
          deletedAt: null,
          id: { not: id },
        },
      });

      if (existingItem) {
        throw new Error('SKU already exists');
      }
    }

    const updateData: any = { ...data };
    
    // Convert cost to Decimal if provided
    if (data.cost !== undefined) {
      updateData.cost = new Decimal(data.cost);
    }

    // Convert payout to Decimal if provided
    if (data.payout !== undefined) {
      updateData.payout = new Decimal(data.payout);
    }

    return await prisma.inventoryItem.update({
      where: { id },
      data: updateData,
      include: {
        product: true,
      },
    });
  }

  /**
   * Soft delete an inventory item
   */
  static async softDeleteInventoryItem(id: string): Promise<InventoryItem> {
    return await prisma.inventoryItem.update({
      where: { id },
      data: { 
        deletedAt: new Date(),
        updatedAt: new Date()
      }
    });
  }

  /**
   * Hard delete an inventory item
   */
  static async hardDeleteInventoryItem(id: string): Promise<InventoryItem> {
    return await prisma.inventoryItem.delete({
      where: { id }
    });
  }

  /**
   * Get inventory items by product ID
   */
  static async getInventoryItemsByProduct(productId: string): Promise<InventoryItem[]> {
    return await prisma.inventoryItem.findMany({
      where: { 
        productId,
        deletedAt: null 
      },
      orderBy: { createdAt: 'desc' },
      include: {
        product: true,
      },
    });
  }

  /**
   * Get inventory items by status
   */
  static async getInventoryItemsByStatus(status: InventoryStatus): Promise<InventoryItem[]> {
    return await prisma.inventoryItem.findMany({
      where: { 
        status,
        deletedAt: null 
      },
      orderBy: { createdAt: 'desc' },
      include: {
        product: true,
      },
    });
  }

  /**
   * Get inventory items by consigner
   */
  static async getInventoryItemsByConsigner(consigner: string): Promise<InventoryItem[]> {
    return await prisma.inventoryItem.findMany({
      where: { 
        consigner: { contains: consigner, mode: 'insensitive' },
        deletedAt: null 
      },
      orderBy: { createdAt: 'desc' },
      include: {
        product: true,
      },
    });
  }

  /**
   * Update inventory quantity
   */
  static async updateInventoryQuantity(id: string, quantity: number): Promise<InventoryItem> {
    return await prisma.inventoryItem.update({
      where: { id },
      data: { 
        quantity,
        updatedAt: new Date()
      },
      include: {
        product: true,
      },
    });
  }

  /**
   * Get total inventory count
   */
  static async getTotalInventoryCount(): Promise<number> {
    const result = await prisma.inventoryItem.aggregate({
      where: { 
        status: InventoryStatus.InStock,
        deletedAt: null 
      },
      _sum: {
        quantity: true,
      },
    });

    return result._sum.quantity || 0;
  }

  /**
   * Get inventory value by consigner
   */
  static async getInventoryValueByConsigner(consigner: string): Promise<number> {
    const inventoryItems = await prisma.inventoryItem.findMany({
      where: { 
        consigner: { contains: consigner, mode: 'insensitive' },
        status: InventoryStatus.InStock,
        deletedAt: null 
      },
      select: {
        cost: true,
        quantity: true,
      },
    });

    return inventoryItems.reduce((sum, item) => {
      return sum + (Number(item.cost) * item.quantity);
    }, 0);
  }

  /**
   * Get low stock inventory items
   */
  static async getLowStockItems(threshold: number = 5): Promise<InventoryItem[]> {
    return await prisma.inventoryItem.findMany({
      where: { 
        quantity: { lte: threshold },
        status: InventoryStatus.InStock,
        deletedAt: null 
      },
      orderBy: { quantity: 'asc' },
      include: {
        product: true,
      },
    });
  }

  /**
   * Get inventory summary
   */
  static async getInventorySummary(): Promise<{
    totalItems: number;
    totalValue: number;
    byStatus: Record<InventoryStatus, number>;
    byCondition: Record<string, number>;
  }> {
    const inventoryItems = await prisma.inventoryItem.findMany({
      where: { deletedAt: null },
      select: {
        status: true,
        condition: true,
        cost: true,
        quantity: true,
      },
    });

    const summary = {
      totalItems: 0,
      totalValue: 0,
      byStatus: {} as Record<InventoryStatus, number>,
      byCondition: {} as Record<string, number>,
    };

    inventoryItems.forEach(item => {
      // Count by status
      summary.byStatus[item.status] = (summary.byStatus[item.status] || 0) + item.quantity;
      
      // Count by condition
      summary.byCondition[item.condition] = (summary.byCondition[item.condition] || 0) + item.quantity;
      
      // Total items and value
      summary.totalItems += item.quantity;
      summary.totalValue += Number(item.cost) * item.quantity;
    });

    return summary;
  }
} 