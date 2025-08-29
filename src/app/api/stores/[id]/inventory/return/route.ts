import { NextRequest, NextResponse } from 'next/server';
import { verifySupabaseAuth } from '@/lib/supabase-auth';
import prisma from '@/lib/db';

// POST /api/stores/[id]/inventory/return - Return items from store inventory to main inventory
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

    const { id: storeId } = await params;
    const body = await request.json();
    const { storeInventoryIds } = body;

    if (!storeInventoryIds || !Array.isArray(storeInventoryIds) || storeInventoryIds.length === 0) {
      return NextResponse.json(
        { error: 'Store inventory item IDs are required' },
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

    // Use transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
      const returnedItems = [];

      for (const storeInventoryId of storeInventoryIds) {
        // Get the store inventory item
        const storeInventoryItem = await tx.storeInventory.findFirst({
          where: {
            id: storeInventoryId,
            storeId,
            deletedAt: null,
            status: 'IN_STOCK' // Only return items that are in stock
          },
          include: {
            inventoryItem: true
          }
        });

        if (!storeInventoryItem) {
          throw new Error(`Store inventory item ${storeInventoryId} not found or not in stock`);
        }

        // Check if the inventory item exists in main inventory (even if deleted)
        const mainInventoryItem = await tx.inventoryItem.findUnique({
          where: {
            id: storeInventoryItem.inventoryItemId
          }
        });

        if (!mainInventoryItem) {
          throw new Error(`Main inventory item ${storeInventoryItem.inventoryItemId} not found`);
        }

        // Update main inventory item - restore it by setting deletedAt to null and status to InStock
        const updatedMainInventoryItem = await tx.inventoryItem.update({
          where: {
            id: storeInventoryItem.inventoryItemId
          },
          data: {
            deletedAt: null,
            status: 'InStock'
          }
        });

        // Mark store inventory item as returned but keep it visible
        const updatedStoreInventoryItem = await tx.storeInventory.update({
          where: {
            id: storeInventoryId
          },
          data: {
            status: 'RETURNED'
          }
        });

        // Create a stock transaction to record the return
        const transaction = await tx.stockTransaction.create({
          data: {
            type: 'TRANSFER_FROM_STORE',
            quantity: storeInventoryItem.quantity,
            date: new Date(),
            fromStoreId: storeId,
            toStoreId: null, // back to warehouse
            inventoryItemId: storeInventoryItem.inventoryItemId,
            notes: `Returned ${storeInventoryItem.quantity} units from ${store.name} to warehouse`
          }
        });

        returnedItems.push({
          storeInventoryItem: updatedStoreInventoryItem,
          mainInventoryItem: updatedMainInventoryItem,
          transaction
        });
      }

      return returnedItems;
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('Error returning items:', error);
    return NextResponse.json(
      { error: `Failed to return items: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
} 