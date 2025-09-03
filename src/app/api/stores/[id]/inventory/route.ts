import { NextRequest, NextResponse } from 'next/server';
import { verifySupabaseAuth } from '@/lib/supabase-auth';
import prisma from '@/lib/db';

// GET /api/stores/[id]/inventory - Get all inventory at specific store
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Check if store exists and is active
    const store = await prisma.store.findFirst({
      where: {
        id,
        deletedAt: null,
        status: 'ACTIVE'
      }
    });

    if (!store) {
      return NextResponse.json(
        { error: 'Store not found or inactive' },
        { status: 404 }
      );
    }

    // Get all inventory items at this store (including sold items with quantity 0)
    const storeInventory = await prisma.storeInventory.findMany({
      where: {
        storeId: id,
        deletedAt: null
      },
      include: {
        inventoryItem: {
          include: {
            product: true
          }
        }
      },
      orderBy: {
        inventoryItem: {
          product: {
            brand: 'asc'
          }
        }
      }
    });

    return NextResponse.json(storeInventory);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch store inventory' },
      { status: 500 }
    );
  }
}

// POST /api/stores/[id]/inventory - Add inventory to store (transfer from warehouse)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, isValid } = await verifySupabaseAuth(request);
    if (!isValid || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - Authentication required' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { inventoryItemId, quantity, transferCost, notes } = body;

    if (!inventoryItemId || !quantity || quantity <= 0) {
      return NextResponse.json(
        { error: 'Valid inventory item ID and quantity are required' },
        { status: 400 }
      );
    }

    if (!transferCost || transferCost <= 0) {
      return NextResponse.json(
        { error: 'Valid transfer cost is required' },
        { status: 400 }
      );
    }

    // Check if store exists and is active
    const store = await prisma.store.findFirst({
      where: {
        id,
        deletedAt: null,
        status: 'ACTIVE'
      }
    });

    if (!store) {
      return NextResponse.json(
        { error: 'Store not found or inactive' },
        { status: 404 }
      );
    }

    // Check if inventory item exists in warehouse
    const warehouseItem = await prisma.inventoryItem.findFirst({
      where: {
        id: inventoryItemId,
        deletedAt: null,
        quantity: {
          gte: quantity
        }
      }
    });

    if (!warehouseItem) {
      return NextResponse.json(
        { error: 'Inventory item not found or insufficient quantity in warehouse' },
        { status: 400 }
      );
    }

    // Use transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
      // Deduct from warehouse
      const updatedWarehouseItem = await tx.inventoryItem.update({
        where: { id: inventoryItemId },
        data: {
          quantity: {
            decrement: quantity
          }
        }
      });

      // Add to store inventory
      const existingStoreInventory = await tx.storeInventory.findUnique({
        where: {
          storeId_inventoryItemId: {
            storeId: id,
            inventoryItemId
          }
        }
      });

      let storeInventory;
      if (existingStoreInventory) {
        // Update existing store inventory - calculate weighted average cost
        const currentQuantity = existingStoreInventory.quantity;
        const currentCost = parseFloat(existingStoreInventory.transferCost.toString());
        const newQuantity = quantity;
        const newCost = parseFloat(transferCost);
        
        const totalQuantity = currentQuantity + newQuantity;
        const weightedAverageCost = ((currentQuantity * currentCost) + (newQuantity * newCost)) / totalQuantity;
        
        storeInventory = await tx.storeInventory.update({
          where: {
            storeId_inventoryItemId: {
              storeId: id,
              inventoryItemId
            }
          },
          data: {
            quantity: {
              increment: quantity
            },
            transferCost: weightedAverageCost,
            status: 'IN_STOCK' // Always set to in stock when transferring
          }
        });
      } else {
        // Create new store inventory record
        storeInventory = await tx.storeInventory.create({
          data: {
            storeId: id,
            inventoryItemId,
            quantity,
            transferCost: parseFloat(transferCost),
            status: 'IN_STOCK' // Always set to in stock when transferring
          }
        });
      }

      // Create transfer transaction
      const transaction = await tx.stockTransaction.create({
        data: {
          type: 'TRANSFER_TO_STORE',
          quantity,
          date: new Date(),
          fromStoreId: null, // warehouse
          toStoreId: id,
          inventoryItemId,
          notes: notes || `Transferred ${quantity} units to ${store.name}`
        }
      });

      return {
        warehouseItem: updatedWarehouseItem,
        storeInventory,
        transaction
      };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to add inventory to store' },
      { status: 500 }
    );
  }
}

// PUT /api/stores/[id]/inventory - Update store inventory item
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, isValid } = await verifySupabaseAuth(request);
    if (!isValid || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - Authentication required' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { id: storeInventoryId, transferCost, quantity, status } = body;

    if (!storeInventoryId) {
      return NextResponse.json(
        { error: 'Store inventory item ID is required' },
        { status: 400 }
      );
    }

    // Check if store exists and is active
    const store = await prisma.store.findFirst({
      where: {
        id,
        deletedAt: null,
        status: 'ACTIVE'
      }
    });

    if (!store) {
      return NextResponse.json(
        { error: 'Store not found or inactive' },
        { status: 404 }
      );
    }

    // Check if store inventory item exists
    const storeInventoryItem = await prisma.storeInventory.findFirst({
      where: {
        id: storeInventoryId,
        storeId: id,
        deletedAt: null
      }
    });

    if (!storeInventoryItem) {
      return NextResponse.json(
        { error: 'Store inventory item not found' },
        { status: 404 }
      );
    }

    // Update the store inventory item
    const updatedStoreInventory = await prisma.storeInventory.update({
      where: {
        id: storeInventoryId
      },
      data: {
        ...(transferCost !== undefined && { transferCost: parseFloat(transferCost) }),
        ...(quantity !== undefined && { quantity: parseInt(quantity, 10) }),
        ...(status !== undefined && { status })
      }
    });

    return NextResponse.json(updatedStoreInventory);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update store inventory item' },
      { status: 500 }
    );
  }
} 