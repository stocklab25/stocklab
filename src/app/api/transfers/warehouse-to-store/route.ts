import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

// POST /api/transfers/warehouse-to-store - Transfer items from warehouse to store
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

    // Check if inventory item exists in warehouse with sufficient quantity
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
            storeId,
            inventoryItemId
          }
        }
      });

      let storeInventory;
      if (existingStoreInventory) {
        // Update existing store inventory
        storeInventory = await tx.storeInventory.update({
          where: {
            storeId_inventoryItemId: {
              storeId,
              inventoryItemId
            }
          },
          data: {
            quantity: {
              increment: quantity
            }
          }
        });
      } else {
        // Create new store inventory record
        storeInventory = await tx.storeInventory.create({
          data: {
            storeId,
            inventoryItemId,
            quantity
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
          toStoreId: storeId,
          inventoryItemId,
          notes: notes || `Transferred ${quantity} units from warehouse to ${store.name}`
        }
      });

      return {
        warehouseItem: updatedWarehouseItem,
        storeInventory,
        transaction,
        store
      };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Error transferring from warehouse to store:', error);
    return NextResponse.json(
      { error: 'Failed to transfer from warehouse to store' },
      { status: 500 }
    );
  }
} 