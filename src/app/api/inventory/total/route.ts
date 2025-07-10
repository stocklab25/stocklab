import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

// GET /api/inventory/total - Get total inventory across warehouse + all stores
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sku = searchParams.get('sku');
    const productId = searchParams.get('productId');

    // Build where clause for inventory items
    const whereClause: any = {
      deletedAt: null
    };

    if (sku) {
      whereClause.sku = sku;
    }

    if (productId) {
      whereClause.productId = productId;
    }

    // Get warehouse inventory
    const warehouseInventory = await prisma.inventoryItem.findMany({
      where: whereClause,
      include: {
        product: true
      },
      orderBy: {
        product: {
          brand: 'asc'
        }
      }
    });

    // Get store inventory for all items
    const storeInventory = await prisma.storeInventory.findMany({
      where: {
        deletedAt: null,
        quantity: {
          gt: 0
        }
      },
      include: {
        inventoryItem: {
          include: {
            product: true
          }
        },
        store: true
      }
    });

    // Combine warehouse and store inventory
    const totalInventory = warehouseInventory.map(warehouseItem => {
      const storeQuantities = storeInventory
        .filter(storeItem => storeItem.inventoryItemId === warehouseItem.id)
        .map(storeItem => ({
          storeId: storeItem.storeId,
          storeName: storeItem.store.name,
          quantity: storeItem.quantity
        }));

      const totalStoreQuantity = storeQuantities.reduce((sum, item) => sum + item.quantity, 0);
      const totalQuantity = warehouseItem.quantity + totalStoreQuantity;

      return {
        id: warehouseItem.id,
        productId: warehouseItem.productId,
        sku: warehouseItem.sku,
        size: warehouseItem.size,
        condition: warehouseItem.condition,
        cost: warehouseItem.cost,
        status: warehouseItem.status,
        warehouseQuantity: warehouseItem.quantity,
        storeQuantities,
        totalQuantity,
        product: warehouseItem.product
      };
    });

    // Filter by SKU if provided
    const filteredInventory = sku 
      ? totalInventory.filter(item => item.sku === sku)
      : totalInventory;

    return NextResponse.json(filteredInventory);
  } catch (error) {
    console.error('Error fetching total inventory:', error);
    return NextResponse.json(
      { error: 'Failed to fetch total inventory' },
      { status: 500 }
    );
  }
} 