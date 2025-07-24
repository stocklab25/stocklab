import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

// Helper function to generate store SKU
const generateStoreSku = async (storeId: string) => {
  const store = await prisma.store.findUnique({
    where: { id: storeId }
  });
  
  if (!store?.storeSkuBase) {
    throw new Error('Store does not have a SKU base configured');
  }
  
  // Count existing store inventory items for this store
  const existingCount = await prisma.storeInventory.count({
    where: { 
      storeId,
      deletedAt: null 
    }
  });
  
  return `${store.storeSkuBase}${existingCount + 1}`;
};

// POST /api/transfers/warehouse-to-store - Transfer items from warehouse to store
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { inventoryItemId, storeId, transferCost, notes } = body;

    if (!inventoryItemId || !storeId) {
      return NextResponse.json(
        { error: 'Valid inventory item ID and store ID are required' },
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

    // Check if inventory item exists in warehouse and is not deleted
    const warehouseItem = await prisma.inventoryItem.findFirst({
      where: {
        id: inventoryItemId,
        deletedAt: null,
        quantity: 1 // Since we now have 1 item per record
      }
    });

    if (!warehouseItem) {
      return NextResponse.json(
        { error: 'Inventory item not found in warehouse or already transferred' },
        { status: 400 }
      );
    }

    // Use transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
      // Soft delete from warehouse (set deletedAt)
      const updatedWarehouseItem = await tx.inventoryItem.update({
        where: { id: inventoryItemId },
        data: {
          deletedAt: new Date()
        }
      });

      // Check if store inventory already exists for this item
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
        // Update existing store inventory - quantity should always be 1
        storeInventory = await tx.storeInventory.update({
          where: {
            storeId_inventoryItemId: {
              storeId,
              inventoryItemId
            }
          },
          data: {
            quantity: 1, // Always 1 since we have 1 item per record
            transferCost: parseFloat(transferCost),
            deletedAt: null // Ensure it's not soft deleted
          }
        });
      } else {
        // Generate store SKU for new inventory
        const storeSku = await generateStoreSku(storeId);
        
        // Create new store inventory record
        storeInventory = await tx.storeInventory.create({
          data: {
            storeId,
            inventoryItemId,
            quantity: 1, // Always 1 since we have 1 item per record
            transferCost: parseFloat(transferCost),
            storeSku
          }
        });
      }

      // Create transfer transaction
      const transaction = await tx.stockTransaction.create({
        data: {
          type: 'TRANSFER_TO_STORE',
          quantity: 1, // Always 1 since we have 1 item per record
          date: new Date(),
          fromStoreId: null, // warehouse
          toStoreId: storeId,
          inventoryItemId,
          notes: notes || `Transferred item from warehouse to ${store.name}`
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
