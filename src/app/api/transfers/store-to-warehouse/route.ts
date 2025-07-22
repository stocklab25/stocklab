import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

// POST /api/transfers/store-to-warehouse - Transfer items from store to warehouse
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { inventoryItemId, storeId, notes } = body;

    if (!inventoryItemId || !storeId) {
      return NextResponse.json(
        { error: 'Valid inventory item ID and store ID are required' },
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

    // Check if inventory item exists at store with quantity = 1
    const storeInventory = await prisma.storeInventory.findFirst({
      where: {
        storeId,
        inventoryItemId,
        deletedAt: null,
        quantity: 1 // Since we now have 1 item per record
      }
    });

    if (!storeInventory) {
      return NextResponse.json(
        { error: 'Inventory item not found at store or already transferred' },
        { status: 400 }
      );
    }

    // Check if warehouse inventory item exists (should be soft deleted)
    const warehouseItem = await prisma.inventoryItem.findFirst({
      where: {
        id: inventoryItemId
      }
    });

    if (!warehouseItem) {
      return NextResponse.json(
        { error: 'Inventory item not found' },
        { status: 400 }
      );
    }

    // Use transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
      // Soft delete from store inventory (set deletedAt)
      const updatedStoreInventory = await tx.storeInventory.update({
        where: {
          storeId_inventoryItemId: {
            storeId,
            inventoryItemId
          }
        },
        data: {
          deletedAt: new Date()
        }
      });

      // Restore to warehouse (unset deletedAt)
      const updatedWarehouseItem = await tx.inventoryItem.update({
        where: { id: inventoryItemId },
        data: {
          deletedAt: null,
          quantity: 1 // Always 1 since we have 1 item per record
        }
      });

      // Create transfer transaction
      const transaction = await tx.stockTransaction.create({
        data: {
          type: 'TRANSFER_FROM_STORE',
          quantity: 1, // Always 1 since we have 1 item per record
          date: new Date(),
          fromStoreId: storeId,
          toStoreId: null, // warehouse
          inventoryItemId,
          notes: notes || `Transferred item from ${store.name} to warehouse`
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
    console.error('Error transferring from store to warehouse:', error);
    return NextResponse.json(
      { error: 'Failed to transfer from store to warehouse' },
      { status: 500 }
    );
  }
} 
