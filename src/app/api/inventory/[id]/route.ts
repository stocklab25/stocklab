import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import prisma from '@/lib/db';

// Auth check function
function checkAuth(req: NextRequest): boolean {
  // Check for auth token in headers
  const authHeader = req.headers.get('authorization');
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    const user = verifyToken(token);
    return !!user;
  }
  
  // Check for auth token in cookies
  const authCookie = req.cookies.get('authToken')?.value;
  if (authCookie) {
    const user = verifyToken(authCookie);
    return !!user;
  }
  
  return false;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    if (!checkAuth(request)) {
      return NextResponse.json(
        { error: 'Unauthorized - Authentication required' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const updateData = await request.json();

    // Check if inventory item exists
    const existingItem = await prisma.inventoryItem.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        product: true,
      },
    });

    if (!existingItem) {
      return NextResponse.json(
        { error: 'Inventory item not found' },
        { status: 404 }
      );
    }

    // Prepare update data
    const dataToUpdate: any = {
      updatedAt: new Date(),
    };

    // Handle different update scenarios
    if (updateData.quantity !== undefined) {
      // Simple quantity update (backward compatibility)
      if (typeof updateData.quantity !== 'number' || updateData.quantity < 0) {
        return NextResponse.json(
          { error: 'Quantity must be a non-negative number' },
          { status: 400 }
        );
      }
      dataToUpdate.quantity = updateData.quantity;
    } else {
      // Full inventory item update
      if (updateData.productId) dataToUpdate.productId = updateData.productId;
      if (updateData.sku) dataToUpdate.sku = updateData.sku;
      if (updateData.size) dataToUpdate.size = updateData.size;
      if (updateData.condition) dataToUpdate.condition = updateData.condition;
      if (updateData.cost !== undefined) dataToUpdate.cost = updateData.cost;
      if (updateData.quantity !== undefined) dataToUpdate.quantity = updateData.quantity;
      if (updateData.status) dataToUpdate.status = updateData.status;
      if (updateData.vendor) dataToUpdate.vendor = updateData.vendor;
      if (updateData.paymentMethod) dataToUpdate.paymentMethod = updateData.paymentMethod;
    }

    // Update the inventory item
    const updatedItem = await prisma.inventoryItem.update({
      where: { id },
      data: dataToUpdate,
      include: {
        product: true,
      },
    });

    return NextResponse.json({
      data: updatedItem,
      success: true
    });
  } catch (error) {
    console.error('Error updating inventory item:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 