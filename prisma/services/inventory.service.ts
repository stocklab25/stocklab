import { PrismaClient, InventoryItem, InventoryStatus, ItemCondition } from '@prisma/client';

const prisma = new PrismaClient();

export interface CreateInventoryItemData {
  productId: string;
  sku: string;
  size: string;
  condition: ItemCondition;
  cost: number;
  status: InventoryStatus;
  quantity?: number;
  vendor: string;
  paymentMethod: string;
  userId: string;
}

export interface UpdateInventoryItemData {
  productId?: string;
  sku?: string;
  size?: string;
  condition?: ItemCondition;
  cost?: number;
  status?: InventoryStatus;
  quantity?: number;
}

export interface InventoryFilters {
  productId?: string;
  sku?: string;
  size?: string;
  condition?: ItemCondition;
  status?: InventoryStatus;
  minCost?: number;
  maxCost?: number;
  minQuantity?: number;
  maxQuantity?: number;
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
}

export class InventoryService {
  static async createInventoryItemWithInitialStock(data: CreateInventoryItemData) {
    let newItem: any = null;
    let initialTransaction: any = null;
    let purchase: any = null;

    try {
      // Check for existing inventory item with same product, size, and condition
      const existingItem = await prisma.inventoryItem.findFirst({
        where: {
          productId: data.productId,
          size: data.size,
          condition: data.condition,
          deletedAt: null,
        },
        include: { product: true }
      });

      if (existingItem) {
        // Update quantity
        const updatedItem = await prisma.inventoryItem.update({
          where: { id: existingItem.id },
          data: {
            quantity: existingItem.quantity + (data.quantity || 1),
            cost: data.cost, // Optionally update cost
            status: data.status,
            updatedAt: new Date(),
          },
          include: { product: true }
        });

        // Create stock in transaction
        initialTransaction = await prisma.stockTransaction.create({
          data: {
            type: 'IN',
            quantity: data.quantity || 1,
            date: new Date(),
            notes: `Stock in - ${updatedItem.product.name} ${updatedItem.size} (${updatedItem.condition})`,
            inventoryItemId: updatedItem.id,
            userId: data.userId,
          },
          include: {
            InventoryItem: { include: { product: true } },
            user: true
          }
        });

        // Generate R3V PO number
        const lastPurchase = await prisma.purchase.findFirst({
          orderBy: { r3vPurchaseOrderNumber: 'desc' },
          select: { r3vPurchaseOrderNumber: true },
        });
        let r3vPurchaseOrderNumber = 'R3VPO1';
        if (lastPurchase) {
          const lastNumber = parseInt(lastPurchase.r3vPurchaseOrderNumber.replace('R3VPO', ''));
          const nextNumber = lastNumber + 1;
          r3vPurchaseOrderNumber = `R3VPO${nextNumber}`;
        }
        // Create purchase record
        purchase = await prisma.purchase.create({
          data: {
            r3vPurchaseOrderNumber,
            inventoryItemId: updatedItem.id,
            vendor: data.vendor,
            paymentMethod: data.paymentMethod,
            orderNumber: data.sku,
            quantity: data.quantity || 1,
            cost: data.cost,
            purchaseDate: new Date(),
            notes: `Stock in for inventory item ${updatedItem.id}`
          }
        });

        return {
          success: true,
          data: {
            inventoryItem: updatedItem,
            transaction: initialTransaction,
            purchase: purchase
          }
        };
      }

      // Step 1: Create the inventory item
      newItem = await prisma.inventoryItem.create({
        data: {
          productId: data.productId,
          sku: data.sku,
          size: data.size,
          condition: data.condition,
          cost: data.cost,
          status: data.status,
          quantity: data.quantity || 1,
        },
        include: {
          product: true
        }
      });

      // Step 2: Create initial stock transaction
      initialTransaction = await prisma.stockTransaction.create({
        data: {
          type: 'IN',
          quantity: newItem.quantity,
          date: new Date(),
          notes: `Initial stock in - ${newItem.product.name} ${newItem.size} (${newItem.condition})`,
          inventoryItemId: newItem.id,
          userId: data.userId,
        },
        include: {
          InventoryItem: {
            include: {
              product: true
            }
          },
          user: true
        }
      });

      // Step 3: Generate R3V PO number
      const lastPurchase = await prisma.purchase.findFirst({
        orderBy: {
          r3vPurchaseOrderNumber: 'desc',
        },
        select: {
          r3vPurchaseOrderNumber: true,
        },
      });

      let r3vPurchaseOrderNumber = 'R3VPO1';
      if (lastPurchase) {
        const lastNumber = parseInt(lastPurchase.r3vPurchaseOrderNumber.replace('R3VPO', ''));
        const nextNumber = lastNumber + 1;
        r3vPurchaseOrderNumber = `R3VPO${nextNumber}`;
      }

      // Step 4: Create purchase record
      purchase = await prisma.purchase.create({
        data: {
          r3vPurchaseOrderNumber,
          inventoryItemId: newItem.id,
          vendor: data.vendor,
          paymentMethod: data.paymentMethod,
          orderNumber: data.sku,
          quantity: newItem.quantity,
          cost: data.cost,
          purchaseDate: new Date(),
          notes: `Initial purchase for inventory item ${newItem.id}`
        }
      });

      return {
        success: true,
        data: {
          inventoryItem: newItem,
          transaction: initialTransaction,
          purchase: purchase
        }
      };

    } catch (error) {
      console.error('Error creating inventory item with initial stock:', error);
      
      // Cleanup on failure
      if (newItem) {
        try {
          await prisma.inventoryItem.delete({
            where: { id: newItem.id }
          });
        } catch (cleanupError) {
          console.error('Failed to cleanup inventory item:', cleanupError);
        }
      }

      if (initialTransaction) {
        try {
          await prisma.stockTransaction.delete({
            where: { id: initialTransaction.id }
          });
        } catch (cleanupError) {
          console.error('Failed to cleanup stock transaction:', cleanupError);
        }
      }

      if (purchase) {
        try {
          await prisma.purchase.delete({
            where: { id: purchase.id }
          });
        } catch (cleanupError) {
          console.error('Failed to cleanup purchase:', cleanupError);
        }
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Update an inventory item
   */
  static async updateInventoryItem(id: string, data: UpdateInventoryItemData): Promise<InventoryItem> {
    return await prisma.inventoryItem.update({
      where: { id },
      data,
      include: {
        product: true,
      },
    });
  }

  /**
   * Get all inventory items with optional filters
   */
  static async getInventoryItems(filters: InventoryFilters = {}): Promise<InventoryItem[]> {
    const whereClause: any = {
      deletedAt: null,
    };

    if (filters.productId) {
      whereClause.productId = filters.productId;
    }

    if (filters.sku) {
      whereClause.sku = { contains: filters.sku, mode: 'insensitive' };
    }

    if (filters.size) {
      whereClause.size = { contains: filters.size, mode: 'insensitive' };
    }

    if (filters.condition) {
      whereClause.condition = filters.condition;
    }

    if (filters.status) {
      whereClause.status = filters.status;
    }

    if (filters.minCost || filters.maxCost) {
      whereClause.cost = {};
      if (filters.minCost) whereClause.cost.gte = filters.minCost;
      if (filters.maxCost) whereClause.cost.lte = filters.maxCost;
    }

    if (filters.minQuantity || filters.maxQuantity) {
      whereClause.quantity = {};
      if (filters.minQuantity) whereClause.quantity.gte = filters.minQuantity;
      if (filters.maxQuantity) whereClause.quantity.lte = filters.maxQuantity;
    }

    return await prisma.inventoryItem.findMany({
      where: whereClause,
      include: {
        product: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Get inventory item by ID
   */
  static async getInventoryItemById(id: string): Promise<InventoryItem | null> {
    return await prisma.inventoryItem.findUnique({
      where: { id },
      include: {
        product: true,
      },
    });
  }

  /**
   * Get inventory item by SKU and size
   */
  static async getInventoryItemBySkuAndSize(sku: string, size: string): Promise<InventoryItem | null> {
    return await prisma.inventoryItem.findFirst({
      where: {
        sku,
        size,
        deletedAt: null,
      },
      include: {
        product: true,
      },
    });
  }

  /**
   * Delete inventory item (soft delete)
   */
  static async deleteInventoryItem(id: string): Promise<InventoryItem> {
    return await prisma.inventoryItem.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
      include: {
        product: true,
      },
    });
  }

  /**
   * Restore deleted inventory item
   */
  static async restoreInventoryItem(id: string): Promise<InventoryItem> {
    return await prisma.inventoryItem.update({
      where: { id },
      data: {
        deletedAt: null,
      },
      include: {
        product: true,
      },
    });
  }

  /**
   * Get inventory items by product
   */
  static async getInventoryItemsByProduct(productId: string): Promise<InventoryItem[]> {
    return await prisma.inventoryItem.findMany({
      where: {
        productId,
        deletedAt: null,
      },
      include: {
        product: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Get inventory items by condition
   */
  static async getInventoryItemsByCondition(condition: ItemCondition): Promise<InventoryItem[]> {
    return await prisma.inventoryItem.findMany({
      where: {
        condition,
        deletedAt: null,
      },
      include: {
        product: true,
      },
      orderBy: {
        createdAt: 'desc',
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
        deletedAt: null,
      },
      include: {
        product: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Get low stock items (quantity <= 5)
   */
  static async getLowStockItems(threshold: number = 5): Promise<InventoryItem[]> {
    return await prisma.inventoryItem.findMany({
      where: {
        quantity: {
          lte: threshold,
        },
        deletedAt: null,
      },
      include: {
        product: true,
      },
      orderBy: {
        quantity: 'asc',
      },
    });
  }

  /**
   * Get total inventory value
   */
  static async getTotalInventoryValue(): Promise<number> {
    const result = await prisma.inventoryItem.aggregate({
      where: {
        deletedAt: null,
      },
      _sum: {
        cost: true,
      },
    });

    return Number(result._sum.cost) || 0;
  }

  /**
   * Get inventory count by status
   */
  static async getInventoryCountByStatus(): Promise<{ status: InventoryStatus; count: number }[]> {
    const result = await prisma.inventoryItem.groupBy({
      by: ['status'],
      where: {
        deletedAt: null,
      },
      _count: {
        status: true,
      },
    });

    return result.map((item) => ({
      status: item.status,
      count: item._count.status,
    }));
  }

  /**
   * Get inventory count by condition
   */
  static async getInventoryCountByCondition(): Promise<{ condition: ItemCondition; count: number }[]> {
    const result = await prisma.inventoryItem.groupBy({
      by: ['condition'],
      where: {
        deletedAt: null,
      },
      _count: {
        condition: true,
      },
    });

    return result.map((item) => ({
      condition: item.condition,
      count: item._count.condition,
    }));
  }
} 