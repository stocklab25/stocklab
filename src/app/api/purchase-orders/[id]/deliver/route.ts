import { NextRequest, NextResponse } from 'next/server';
import { verifySupabaseAuth } from '@/lib/supabase-auth';
import prisma from '@/lib/db';
import { fulfillPurchaseOrder } from '@/prisma/services/purchase.service';

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

    // Use shared function to fulfill the purchase order
    const createdInventoryItems = await fulfillPurchaseOrder(updatedPurchaseOrder);

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