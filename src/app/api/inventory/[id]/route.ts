import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/db';

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
    const { quantity } = await request.json();

    // Validate quantity
    if (typeof quantity !== 'number' || quantity < 0) {
      return NextResponse.json(
        { error: 'Quantity must be a non-negative number' },
        { status: 400 }
      );
    }

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

    // Update the product quantity (not the inventory item quantity)
    const updatedProduct = await prisma.product.update({
      where: { id: existingItem.productId },
      data: {
        quantity,
        updatedAt: new Date(),
      },
    });

    // Return the updated inventory item with the updated product
    const updatedItem = await prisma.inventoryItem.findFirst({
      where: { id },
      include: {
        product: true,
      },
    });

    return NextResponse.json({
      data: updatedItem,
      success: true
    });
  } catch (error) {
    console.error('Error updating inventory quantity:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 