import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyToken } from '@/lib/auth';

const prisma = new PrismaClient();

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

export async function DELETE(req: NextRequest, context: any) {
  // Check authentication
  if (!checkAuth(req)) {
    return NextResponse.json(
      { error: 'Unauthorized - Authentication required' },
      { status: 401 }
    );
  }

  try {
    const id = (await context.params).id;
    const { searchParams } = new URL(req.url);
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

export async function PUT(req: NextRequest, context: any) {
  // Check authentication
  if (!checkAuth(req)) {
    return NextResponse.json(
      { error: 'Unauthorized - Authentication required' },
      { status: 401 }
    );
  }

  try {
    const id = (await context.params).id;
    const body = await req.json();
    const { brand, name, color, sku } = body;

    // Validate required fields
    if (!brand || !name) {
      return NextResponse.json(
        { error: 'Brand and name are required' },
        { status: 400 }
      );
    }

    // Check if product exists and is not deleted
    const existingProduct = await prisma.product.findFirst({
      where: { 
        id,
        deletedAt: null
      }
    });

    if (!existingProduct) {
      return NextResponse.json(
        { error: 'Product not found or archived' },
        { status: 404 }
      );
    }

    // Check if SKU is unique (if provided)
    if (sku && sku !== existingProduct.sku) {
      const existingSku = await prisma.product.findFirst({
        where: { 
          sku,
          deletedAt: null,
          id: { not: id }
        }
      });

      if (existingSku) {
        return NextResponse.json(
          { error: 'SKU already exists' },
          { status: 400 }
        );
      }
    }

    // Update the product
    const updatedProduct = await prisma.product.update({
      where: { id },
      data: { 
        brand,
        name,
        color,
        sku,
        updatedAt: new Date()
      }
    });
    
    return NextResponse.json({
      data: updatedProduct,
      success: true,
      message: 'Product updated successfully'
    });
  } catch (error) {
    console.error('Error updating product:', error);
    return NextResponse.json(
      { error: 'Failed to update product' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest, context: any) {
  // Check authentication
  if (!checkAuth(req)) {
    return NextResponse.json(
      { error: 'Unauthorized - Authentication required' },
      { status: 401 }
    );
  }

  try {
    const id = (await context.params).id;
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');

    if (action === 'restore') {
      // Check if product exists and is archived
      const existingProduct = await prisma.product.findFirst({
        where: { 
          id,
          deletedAt: { not: null }
        }
      });

      if (!existingProduct) {
        return NextResponse.json(
          { error: 'Product not found or not archived' },
          { status: 404 }
        );
      }

      // Restore the product
      const restoredProduct = await prisma.product.update({
        where: { id },
        data: { 
          deletedAt: null,
          updatedAt: new Date()
        }
      });
      
      return NextResponse.json({
        data: restoredProduct,
        success: true,
        message: 'Product restored successfully'
      });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error restoring product:', error);
    return NextResponse.json(
      { error: 'Failed to restore product' },
      { status: 500 }
    );
  }
} 