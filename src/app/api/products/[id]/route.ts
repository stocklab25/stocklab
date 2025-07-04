import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const product = await prisma.product.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error('Error fetching product:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Check authentication
  if (!checkAuth(request)) {
    return NextResponse.json(
      { error: 'Unauthorized - Authentication required' },
      { status: 401 }
    );
  }

  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const isHardDelete = searchParams.get('hard') === 'true';
    const forceDelete = searchParams.get('force') === 'true';

    // Check if product exists and is not already deleted
    const existingProduct = await prisma.product.findFirst({
      where: { 
        id,
        deletedAt: null
      },
      include: {
        stockTransactions: {
          where: { deletedAt: null }
        }
      }
    });

    if (!existingProduct) {
      return NextResponse.json(
        { error: 'Product not found or already deleted' },
        { status: 404 }
      );
    }

    // For hard delete, check if there are active transactions (unless force delete)
    if (isHardDelete && !forceDelete && existingProduct.stockTransactions.length > 0) {
      return NextResponse.json(
        { 
          error: 'Cannot hard delete product with active transactions. Use force=true to delete everything.',
          transactionCount: existingProduct.stockTransactions.length,
          suggestion: 'Add ?force=true to delete product and all related data'
        },
        { status: 400 }
      );
    }

    if (isHardDelete) {
      // Hard delete - permanently remove the product and related data
      await prisma.$transaction(async (tx: any) => {
        // Delete related transactions first
        await tx.stockTransaction.deleteMany({
          where: { productId: id }
        });
        
        // Delete related inventory items
        await tx.inventoryItem.deleteMany({
          where: { productId: id }
        });
        
        // Finally delete the product
        await tx.product.delete({
          where: { id }
        });
      });
      
      return NextResponse.json({
        success: true,
        message: forceDelete 
          ? 'Product and all related data permanently deleted' 
          : 'Product permanently deleted'
      });
    } else {
      // Soft delete (archive) - just set deletedAt timestamp
      const deletedProduct = await prisma.product.update({
        where: { id },
        data: { 
          deletedAt: new Date(),
          updatedAt: new Date()
        }
      });
      
      return NextResponse.json({
        data: deletedProduct,
        success: true,
        message: 'Product archived successfully'
      });
    }
  } catch (error) {
    console.error('Error deleting product:', error);
    return NextResponse.json(
      { error: 'Failed to delete product' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await request.json();

    // Validate required fields
    if (!data.brand || !data.name) {
      return NextResponse.json(
        { error: 'Brand and name are required' },
        { status: 400 }
      );
    }

    // Check if product exists
    const existingProduct = await prisma.product.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!existingProduct) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Check if SKU is unique (if provided)
    if (data.sku && data.sku !== existingProduct.sku) {
      const skuExists = await prisma.product.findFirst({
        where: {
          sku: data.sku,
          deletedAt: null,
          id: { not: id },
        },
      });

      if (skuExists) {
        return NextResponse.json(
          { error: 'SKU already exists' },
          { status: 400 }
        );
      }
    }

    const updatedProduct = await prisma.product.update({
      where: { id },
      data: {
        brand: data.brand,
        name: data.name,
        color: data.color,
        sku: data.sku,
        quantity: data.quantity !== undefined ? parseInt(data.quantity) : undefined,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json(updatedProduct);
  } catch (error) {
    console.error('Error updating product:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Check authentication
  if (!checkAuth(request)) {
    return NextResponse.json(
      { error: 'Unauthorized - Authentication required' },
      { status: 401 }
    );
  }

  try {
    const { id } = await params;
    const data = await request.json();

    // Check if product exists
    const existingProduct = await prisma.product.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!existingProduct) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Update only the provided fields
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (data.brand !== undefined) updateData.brand = data.brand;
    if (data.name !== undefined) updateData.name = data.name;
    if (data.color !== undefined) updateData.color = data.color;
    if (data.sku !== undefined) updateData.sku = data.sku;
    if (data.quantity !== undefined) updateData.quantity = parseInt(data.quantity);

    // Check if SKU is unique (if being updated)
    if (data.sku && data.sku !== existingProduct.sku) {
      const skuExists = await prisma.product.findFirst({
        where: {
          sku: data.sku,
          deletedAt: null,
          id: { not: id },
        },
      });

      if (skuExists) {
        return NextResponse.json(
          { error: 'SKU already exists' },
          { status: 400 }
        );
      }
    }

    const updatedProduct = await prisma.product.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(updatedProduct);
  } catch (error) {
    console.error('Error updating product:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 