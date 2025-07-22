import { NextRequest, NextResponse } from 'next/server';
import { verifySupabaseAuth } from '@/lib/supabase-auth';
import prisma from '@/lib/db';

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
    // Items are delivered to warehouse, no location needed

    // Get the purchase order with items
    const purchaseOrder = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        purchaseOrderItems: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!purchaseOrder) {
      return NextResponse.json(
        { error: 'Purchase order not found' },
        { status: 404 }
      );
    }

    if (purchaseOrder.status === 'DELIVERED') {
      return NextResponse.json(
        { error: 'Purchase order is already delivered' },
        { status: 400 }
      );
    }

    // Generate StockLab SKU first - find the highest existing SL number
    const lastInventoryItem = await prisma.inventoryItem.findFirst({
      where: {
        stocklabSku: {
          not: null,
        },
      },
      orderBy: {
        stocklabSku: 'desc',
      },
    });

    let nextNumber = 1;
    if (lastInventoryItem?.stocklabSku) {
      const match = lastInventoryItem.stocklabSku.match(/SL(\d+)/);
      if (match) {
        nextNumber = parseInt(match[1]) + 1;
      }
    }

    // Update purchase order status first
    const updatedPurchaseOrder = await prisma.purchaseOrder.update({
      where: { id },
      data: {
        status: 'DELIVERED',
        deliveryDate: new Date(),
      },
      include: {
        purchaseOrderItems: {
          include: {
            product: true,
          },
        },
      },
    });

    // Create individual inventory items for each physical item
    // Each item gets its own record with quantity = 1 and unique StockLab SKU
    const createdInventoryItems = [];
    
    for (const item of purchaseOrder.purchaseOrderItems) {
      // Create individual inventory items for each quantity ordered
      for (let i = 0; i < item.quantityOrdered; i++) {
        const stocklabSku = `SL${nextNumber}`;
        nextNumber++;

        // Create individual inventory item
        const inventoryItem = await prisma.inventoryItem.create({
          data: {
            productId: item.productId,
            sku: item.product.sku || '',
            stocklabSku: stocklabSku,
            size: item.size,
            condition: item.condition || 'NEW', // Use the condition from purchase order item
            cost: item.unitCost,
            status: 'InStock',
            quantity: 1, // Always 1 for individual items
            purchaseOrderId: purchaseOrder.id,
          },
          include: {
            product: true,
          },
        });

        // Create stock transaction for individual item
        await prisma.stockTransaction.create({
          data: {
            type: 'IN',
            quantity: 1, // Always 1 for individual items
            date: new Date(),
            notes: `Stock in from purchase order ${purchaseOrder.orderNumber} - ${item.product.name} ${item.size} (Item ${i + 1}/${item.quantityOrdered})`,
            inventoryItemId: inventoryItem.id,
            userId: null,
          },
        });

        createdInventoryItems.push(inventoryItem);
      }
    }

    const result = {
      purchaseOrder: updatedPurchaseOrder,
      inventoryItems: createdInventoryItems,
    };

    return NextResponse.json({
      success: true,
      data: result,
      message: `Purchase order marked as delivered and ${createdInventoryItems.length} individual inventory items created`,
    });
  } catch (error) {
    console.error('Error delivering purchase order:', error);
    return NextResponse.json(
      { error: 'Failed to deliver purchase order' },
      { status: 500 }
    );
  }
} 