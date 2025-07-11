import { NextRequest, NextResponse } from 'next/server';
import { verifySupabaseAuth } from '@/lib/supabase-auth';
import prisma from '@/lib/db';

export async function GET(
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

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        inventoryItems: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
        },
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
      { error: 'Failed to fetch product' },
      { status: 500 }
    );
  }
}

export async function PUT(
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
    const data = await request.json();

    // Check if product exists
    const existingProduct = await prisma.product.findUnique({
      where: { id },
    });

    if (!existingProduct) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // If SKU is being updated, check for uniqueness
    if (data.sku && data.sku !== existingProduct.sku) {
      const duplicateSku = await prisma.product.findFirst({
        where: {
          sku: data.sku,
          id: { not: id },
          deletedAt: null,
        },
      });

      if (duplicateSku) {
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
        itemType: data.itemType,
        updatedAt: new Date(),
      },
      include: {
        inventoryItems: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    return NextResponse.json(updatedProduct);
  } catch (error) {
    console.error('Error updating product:', error);
    return NextResponse.json(
      { error: 'Failed to update product' },
      { status: 500 }
    );
  }
}

export async function DELETE(
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
    const { searchParams } = new URL(request.url);
    const isHardDelete = searchParams.get('hard') === 'true';

    // Check if product exists
    const existingProduct = await prisma.product.findFirst({
      where: { 
        id,
        deletedAt: null
      },
      include: {
        inventoryItems: {
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

    // Check if product has active inventory items
    if (existingProduct.inventoryItems.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete product with active inventory items' },
        { status: 400 }
      );
    }

    if (isHardDelete) {
      // Hard delete - permanently remove the product
      await prisma.product.delete({
        where: { id }
      });
      
      return NextResponse.json({
        success: true,
        message: 'Product permanently deleted'
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