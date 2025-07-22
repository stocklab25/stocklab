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

    const inventoryItem = await prisma.inventoryItem.findUnique({
      where: { id },
      include: {
        product: true,
        stockTransactions: {
          where: { deletedAt: null },
          orderBy: { date: 'desc' },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!inventoryItem) {
      return NextResponse.json(
        { error: 'Inventory item not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(inventoryItem);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch inventory item' },
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

    // Check if inventory item exists
    const existingItem = await prisma.inventoryItem.findUnique({
      where: { id },
    });

    if (!existingItem) {
      return NextResponse.json(
        { error: 'Inventory item not found' },
        { status: 404 }
      );
    }

    // If SKU is being updated, check for uniqueness
    if (data.sku && data.sku !== existingItem.sku) {
      const duplicateSku = await prisma.inventoryItem.findFirst({
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

    const updatedItem = await prisma.inventoryItem.update({
      where: { id },
      data: {
        sku: data.sku,
        size: data.size,
        condition: data.condition,
        cost: data.cost ? parseFloat(data.cost) : undefined,
        status: data.status,
        quantity: 1, // Always 1 for individual items
        note: data.note,
        updatedAt: new Date(),
      },
      include: {
        product: true,
      },
    });

    return NextResponse.json(updatedItem);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update inventory item' },
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

    // Check if inventory item exists
    const existingItem = await prisma.inventoryItem.findFirst({
      where: { 
        id,
        deletedAt: null
      },
      include: {
        stockTransactions: {
          where: { deletedAt: null }
        },
        sales: {
          where: { deletedAt: null }
        }
      }
    });

    if (!existingItem) {
      return NextResponse.json(
        { error: 'Inventory item not found or already deleted' },
        { status: 404 }
      );
    }

    // Check if inventory item has active transactions or sales
    if (existingItem.stockTransactions.length > 0 || existingItem.sales.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete inventory item with active transactions or sales' },
        { status: 400 }
      );
    }

    if (isHardDelete) {
      // Hard delete - permanently remove the inventory item
      await prisma.inventoryItem.delete({
        where: { id }
      });
      
      return NextResponse.json({
        success: true,
        message: 'Inventory item permanently deleted'
      });
    } else {
      // Soft delete (archive) - just set deletedAt timestamp
      const deletedItem = await prisma.inventoryItem.update({
        where: { id },
        data: { 
          deletedAt: new Date(),
          updatedAt: new Date()
        }
      });
      
      return NextResponse.json({
        data: deletedItem,
        success: true,
        message: 'Inventory item archived successfully'
      });
    }
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to delete inventory item' },
      { status: 500 }
    );
  }
} 