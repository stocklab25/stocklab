import { NextRequest, NextResponse } from 'next/server';
import { verifySupabaseAuth } from '@/lib/supabase-auth';
import prisma from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const { user, isValid } = await verifySupabaseAuth(request);
    if (!isValid || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - Authentication required' },
        { status: 401 }
      );
    }

    const purchaseOrder = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        purchaseOrderItems: {
          include: {
            product: true,
          },
        },
        inventoryItems: {
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

    return NextResponse.json(purchaseOrder);
  } catch (error) {
    console.error('Error fetching purchase order:', error);
    return NextResponse.json(
      { error: 'Failed to fetch purchase order' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const { user, isValid } = await verifySupabaseAuth(request);
    if (!isValid || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      vendorName,
      orderNumber,
      orderDate,
      deliveryDate,
      status,
      totalAmount,
      notes,
      items,
    } = body;

    // Use a transaction to update both purchase order and items
    const purchaseOrder = await prisma.$transaction(async (tx) => {
      // Update the purchase order
      const updatedPurchaseOrder = await tx.purchaseOrder.update({
        where: { id },
        data: {
          vendorName,
          orderNumber,
          orderDate: orderDate ? new Date(orderDate) : undefined,
          deliveryDate: deliveryDate ? new Date(deliveryDate) : undefined,
          status,
          totalAmount: totalAmount ? parseFloat(totalAmount) : undefined,
          notes,
        },
      });

      // Handle items if provided
      if (items && Array.isArray(items)) {
        // Delete existing items
        await tx.purchaseOrderItem.deleteMany({
          where: { purchaseOrderId: id },
        });

        // Create new items
        for (const item of items) {
          await tx.purchaseOrderItem.create({
            data: {
              purchaseOrderId: id,
              productId: item.productId,
              size: item.size,
              condition: item.condition,
              quantityOrdered: item.quantityOrdered,
              unitCost: item.unitCost,
              totalCost: item.totalCost,
            },
          });
        }
      }

      // Return the updated purchase order with items
      return await tx.purchaseOrder.findUnique({
        where: { id },
        include: {
          purchaseOrderItems: {
            include: {
              product: true,
            },
          },
          inventoryItems: {
            include: {
              product: true,
            },
          },
        },
      });
    });

    return NextResponse.json(purchaseOrder);
  } catch (error) {
    console.error('Error updating purchase order:', error);
    return NextResponse.json(
      { error: 'Failed to update purchase order' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const { user, isValid } = await verifySupabaseAuth(request);
    if (!isValid || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - Authentication required' },
        { status: 401 }
      );
    }

    // Check if purchase order has inventory items
    const purchaseOrder = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        inventoryItems: true,
      },
    });

    if (!purchaseOrder) {
      return NextResponse.json(
        { error: 'Purchase order not found' },
        { status: 404 }
      );
    }

    // Always allow soft deletion, even if inventory items exist
    // The inventory items will remain in the system but the purchase order will be marked as deleted
    
    // Soft delete the purchase order and its items
    await prisma.purchaseOrderItem.deleteMany({
      where: { purchaseOrderId: id },
    });

    await prisma.purchaseOrder.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({ message: 'Purchase order deleted successfully' });
  } catch (error) {
    console.error('Error deleting purchase order:', error);
    return NextResponse.json(
      { error: 'Failed to delete purchase order' },
      { status: 500 }
    );
  }
} 