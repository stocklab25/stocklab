import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

// POST /api/transfers/store-to-warehouse - Transfer items from store to warehouse
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { inventoryItemId, storeId, quantity, notes } = body;

    if (!inventoryItemId || !storeId || !quantity || quantity <= 0) {
      return NextResponse.json(
        { error: 'Valid inventory item ID, store ID, and quantity are required' },
        { status: 400 }
      );
    }

    // Check if store exists and is active
    const store = await prisma.store.findFirst({
      where: {
        id: storeId,
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

    // Check if inventory item exists at store with sufficient quantity
    const storeInventory = await prisma.storeInventory.findFirst({
      where: {
        storeId,
        inventoryItemId,
        deletedAt: null,
        quantity: {
          gte: quantity
        }
      }
    });

    if (!storeInventory) {
      return NextResponse.json(
        { error: 'Inventory item not found or insufficient quantity at store' },
        { status: 400 }
      );
    }

    // Check if warehouse inventory item exists
    const warehouseItem = await prisma.inventoryItem.findFirst({
      where: {
        id: inventoryItemId,
        deletedAt: null
      }
    });

    if (!warehouseItem) {
      return NextResponse.json(
        { error: 'Inventory item not found in warehouse' },
        { status: 400 }
      );
    }

    // Use transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
      // Deduct from store inventory
      const updatedStoreInventory = await tx.storeInventory.update({
        where: {
          storeId_inventoryItemId: {
            storeId,
            inventoryItemId
          }
        },
        data: {
          quantity: {
            decrement: quantity
          }
        }
      });

      // Add to warehouse
      const updatedWarehouseItem = await tx.inventoryItem.update({
        where: { id: inventoryItemId },
        data: {
          quantity: {
            increment: quantity
          }
        }
      });

      // Create transfer transaction
      const transaction = await tx.stockTransaction.create({
        data: {
          type: 'TRANSFER_FROM_STORE',
          quantity,
          date: new Date(),
          fromStoreId: storeId,
          toStoreId: null, // warehouse
          inventoryItemId,
          notes: notes || `Transferred ${quantity} units from ${store.name} to warehouse`
        }
      });

      return {
        warehouseItem: updatedWarehouseItem,
        storeInventory: updatedStoreInventory,
        transaction,
        store
      };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    
    return NextResponse.json(
      { error: 'Failed to transfer from store to warehouse' },
      { status: 500 }
    );
  }
} 
