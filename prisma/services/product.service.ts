import { PrismaClient, Product, Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

export interface CreateProductData {
  brand: string;
  name: string;
  color?: string;
  sku?: string;
  cost?: number;
  payout?: number;
}

export interface UpdateProductData {
  brand?: string;
  name?: string;
  color?: string;
  sku?: string;
  cost?: number;
  payout?: number;
}

export interface ProductFilters {
  search?: string;
  brand?: string;
  color?: string;
  showDeleted?: boolean;
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
}

export interface ProductWithInventory extends Product {
  inventoryItems: Array<{
    id: string;
    size: string;
    condition: string;
    quantity: number;
    status: string;
  }>;
  totalQuantity: number;
}

export class ProductService {
  /**
   * Create a new product (product type)
   */
  static async createProduct(data: CreateProductData): Promise<Product> {
    // Check if SKU is unique (if provided)
    if (data.sku) {
      const existingProduct = await prisma.product.findFirst({
        where: {
          sku: data.sku,
          deletedAt: null,
        },
      });

      if (existingProduct) {
        throw new Error('SKU already exists');
      }
    }

    return await prisma.product.create({
      data: {
        brand: data.brand,
        name: data.name,
        color: data.color,
        sku: data.sku,
        itemType: 'SHOE', // Default to SHOE, or set as needed
      },
    });
  }

  /**
   * Get products with filtering and pagination
   */
  static async getProducts(
    filters: ProductFilters = {},
    pagination: PaginationOptions = {}
  ): Promise<{ data: Product[]; total: number; pagination: any }> {
    const { page = 1, limit = 10 } = pagination;
    const skip = (page - 1) * limit;

    // Build where clause
    const whereClause: any = {};

    if (!filters.showDeleted) {
      whereClause.deletedAt = null;
    }

    if (filters.search) {
      whereClause.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { brand: { contains: filters.search, mode: 'insensitive' } },
        { sku: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    if (filters.brand) {
      whereClause.brand = { contains: filters.brand, mode: 'insensitive' };
    }

    if (filters.color) {
      whereClause.color = { contains: filters.color, mode: 'insensitive' };
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.product.count({ where: whereClause }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: products,
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
   * Get products with inventory information
   */
  static async getProductsWithInventory(
    filters: ProductFilters = {},
    pagination: PaginationOptions = {}
  ): Promise<{ data: ProductWithInventory[]; total: number; pagination: any }> {
    const { page = 1, limit = 10 } = pagination;
    const skip = (page - 1) * limit;

    // Build where clause
    const whereClause: any = {};

    if (!filters.showDeleted) {
      whereClause.deletedAt = null;
    }

    if (filters.search) {
      whereClause.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { brand: { contains: filters.search, mode: 'insensitive' } },
        { sku: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    if (filters.brand) {
      whereClause.brand = { contains: filters.brand, mode: 'insensitive' };
    }

    if (filters.color) {
      whereClause.color = { contains: filters.color, mode: 'insensitive' };
    }

    const products = await prisma.product.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        inventoryItems: {
          where: { deletedAt: null },
          select: {
            id: true,
            size: true,
            condition: true,
            quantity: true,
            status: true,
          },
        },
      },
    });

    // Calculate total quantity for each product
    const productsWithInventory = products.map(product => {
      const totalQuantity = product.inventoryItems.reduce((sum, item) => {
        return sum + (item.status === 'InStock' ? item.quantity : 0);
      }, 0);

      return {
        ...product,
        totalQuantity,
      };
    });

    const total = await prisma.product.count({ where: whereClause });
    const totalPages = Math.ceil(total / limit);

    return {
      data: productsWithInventory,
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
   * Get a single product by ID
   */
  static async getProductById(id: string): Promise<Product | null> {
    return await prisma.product.findFirst({
      where: { id, deletedAt: null },
    });
  }

  /**
   * Get a single product with inventory by ID
   */
  static async getProductWithInventoryById(id: string): Promise<ProductWithInventory | null> {
    const product = await prisma.product.findFirst({
      where: { id, deletedAt: null },
      include: {
        inventoryItems: {
          where: { deletedAt: null },
          select: {
            id: true,
            size: true,
            condition: true,
            quantity: true,
            status: true,
          },
        },
      },
    });

    if (!product) return null;

    const totalQuantity = product.inventoryItems.reduce((sum, item) => {
      return sum + (item.status === 'InStock' ? item.quantity : 0);
    }, 0);

    return {
      ...product,
      totalQuantity,
    };
  }

  /**
   * Update a product
   */
  static async updateProduct(id: string, data: UpdateProductData): Promise<Product> {
    // Check if SKU is unique (if provided)
    if (data.sku) {
      const existingProduct = await prisma.product.findFirst({
        where: {
          sku: data.sku,
          deletedAt: null,
          id: { not: id },
        },
      });

      if (existingProduct) {
        throw new Error('SKU already exists');
      }
    }

    const updateData: any = { ...data };
    
    // Convert cost and payout to Decimal if provided
    if (data.cost !== undefined) {
      updateData.cost = data.cost ? new Decimal(data.cost) : null;
    }
    if (data.payout !== undefined) {
      updateData.payout = data.payout ? new Decimal(data.payout) : null;
    }

    return await prisma.product.update({
      where: { id },
      data: updateData,
    });
  }

  /**
   * Soft delete a product
   */
  static async softDeleteProduct(id: string): Promise<Product> {
    return await prisma.product.update({
      where: { id },
      data: { 
        deletedAt: new Date(),
        updatedAt: new Date()
      }
    });
  }

  /**
   * Hard delete a product
   */
  static async hardDeleteProduct(id: string): Promise<Product> {
    return await prisma.product.delete({
      where: { id }
    });
  }

  /**
   * Get products by brand
   */
  static async getProductsByBrand(brand: string): Promise<Product[]> {
    return await prisma.product.findMany({
      where: { 
        brand: { contains: brand, mode: 'insensitive' },
        deletedAt: null 
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get total value of inventory
   */
  static async getInventoryValue(): Promise<{ totalCost: number; totalPayout: number }> {
    const inventoryItems = await prisma.inventoryItem.findMany({
      where: { 
        status: 'InStock',
        deletedAt: null 
      },
      select: {
        cost: true,
        quantity: true,
      },
    });

    const totalCost = inventoryItems.reduce((sum, item) => {
      return sum + (Number(item.cost) * item.quantity);
    }, 0);



    // Since payout is not stored in inventory items, we'll return 0 for totalPayout
    // Payout is only available in sales records
    const totalPayout = 0;

    return { totalCost, totalPayout };
  }

  /**
   * Get low stock products (products with low inventory)
   */
  static async getLowStockProducts(threshold: number = 5): Promise<ProductWithInventory[]> {
    const products = await prisma.product.findMany({
      where: { deletedAt: null },
      include: {
        inventoryItems: {
          where: { 
            status: 'InStock',
            deletedAt: null 
          },
          select: {
            id: true,
            size: true,
            condition: true,
            quantity: true,
            status: true,
          },
        },
      },
    });

    const productsWithLowStock = products
      .map(product => {
        const totalQuantity = product.inventoryItems.reduce((sum, item) => {
          return sum + (item.status === 'InStock' ? item.quantity : 0);
        }, 0);

        return {
          ...product,
          totalQuantity,
        };
      })
      .filter(product => product.totalQuantity <= threshold);

    return productsWithLowStock;
  }
} 