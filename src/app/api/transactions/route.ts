import { NextRequest, NextResponse } from 'next/server';
import { verifySupabaseAuth } from '@/lib/supabase-auth';
import prisma from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { user, isValid } = await verifySupabaseAuth(req);
    if (!isValid || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const type = searchParams.get('type') || '';
    const showDeleted = searchParams.get('showDeleted') === 'true';

    const skip = (page - 1) * limit;

    // Build where clause
    const whereClause: Record<string, unknown> = {};

    if (!showDeleted) {
      whereClause.deletedAt = null;
    }

    if (type) {
      whereClause.type = type;
    }

    // Get transactions with pagination
    const transactions = await prisma.stockTransaction.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        InventoryItem: {
          include: {
            product: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Get total count for pagination
    const total = await prisma.stockTransaction.count({
      where: whereClause,
    });

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      data: transactions,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, isValid } = await verifySupabaseAuth(req);
    if (!isValid || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - Authentication required' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const {
      inventoryItemId,
      type,
      quantity,
      notes,
      transactionDate,
      toStoreId,
    } = body;

    // Validate required fields
    if (!inventoryItemId || !type || !quantity) {
      return NextResponse.json(
        { error: 'Missing required fields: inventoryItemId, type, quantity' },
        { status: 400 }
      );
    }

    // If TRANSFER_TO_STORE, check for storeSkuBase
    if (type === 'TRANSFER_TO_STORE') {
      if (!toStoreId) {
        return NextResponse.json(
          { error: 'Missing toStoreId for TRANSFER_TO_STORE', code: 'MISSING_TO_STORE_ID' },
          { status: 400 }
        );
      }
      const store = await prisma.store.findUnique({ where: { id: toStoreId } });
      if (!store?.storeSkuBase) {
        return NextResponse.json(
          { error: 'Store does not have a SKU base configured', code: 'MISSING_STORE_SKU_BASE' },
          { status: 400 }
        );
      }
    }

    // Check if inventory item exists
    const inventoryItem = await prisma.inventoryItem.findUnique({
      where: { id: inventoryItemId },
    });

    if (!inventoryItem) {
      return NextResponse.json(
        { error: 'Inventory item not found' },
        { status: 404 }
      );
    }

    // Create transaction
    const transaction = await prisma.stockTransaction.create({
      data: {
        inventoryItemId,
        type,
        quantity: parseInt(quantity),
        notes,
        date: transactionDate ? new Date(transactionDate) : new Date(),
        userId: null, // Set to null to avoid foreign key constraint
      },
      include: {
        InventoryItem: {
          include: {
            product: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Update inventory quantity based on transaction type
    let quantityChange = 0;
    if (type === 'IN') {
      quantityChange = parseInt(quantity);
    } else if (type === 'OUT') {
      quantityChange = -parseInt(quantity);
    }

    if (quantityChange !== 0) {
      await prisma.inventoryItem.update({
        where: { id: inventoryItemId },
        data: {
          quantity: {
            increment: quantityChange,
          },
        },
      });
    }

    return NextResponse.json(transaction, { status: 201 });
  } catch (error) {
    console.error('Error creating transaction:', error);
    return NextResponse.json(
      { error: 'Failed to create transaction' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { user, isValid } = await verifySupabaseAuth(req);
    if (!isValid || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const isHardDelete = searchParams.get('hard') === 'true';
    
    if (!id) {
      return NextResponse.json(
        { error: 'Transaction ID is required' },
        { status: 400 }
      );
    }

    // Check if transaction exists and is not already deleted
    const existingTransaction = await prisma.stockTransaction.findFirst({
      where: { 
        id,
        deletedAt: null
      }
    });

    if (!existingTransaction) {
      return NextResponse.json(
        { error: 'Transaction not found or already deleted' },
        { status: 404 }
      );
    }

    if (isHardDelete) {
      // Hard delete - permanently remove the transaction
      await prisma.stockTransaction.delete({
        where: { id }
      });
      
      return NextResponse.json({
        success: true,
        message: 'Transaction permanently deleted'
      });
    } else {
      // Soft delete (archive) - just set deletedAt timestamp
      const deletedTransaction = await prisma.stockTransaction.update({
        where: { id },
        data: { 
          deletedAt: new Date(),
          updatedAt: new Date()
        }
      });
      
      return NextResponse.json({
        data: deletedTransaction,
        success: true,
        message: 'Transaction archived successfully'
      });
    }
  } catch (error) {
    console.error('Error deleting transaction:', error);
    return NextResponse.json(
      { error: 'Failed to delete transaction' },
      { status: 500 }
    );
  }
} 
