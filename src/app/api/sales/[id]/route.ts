import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

// GET /api/sales/[id] - Get a specific sale
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const sale = await prisma.sale.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        store: true,
        inventoryItem: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!sale) {
      return NextResponse.json(
        { error: 'Sale not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(sale);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch sale' },
      { status: 500 }
    );
  }
}

// PUT /api/sales/[id] - Update a sale
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { cost, payout, discount, notes, status, payoutMethod } = body;

    // Check if sale exists
    const existingSale = await prisma.sale.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!existingSale) {
      return NextResponse.json(
        { error: 'Sale not found' },
        { status: 404 }
      );
    }

    // Update the sale
    const updatedSale = await prisma.sale.update({
      where: { id },
      data: {
        cost: cost ? parseFloat(cost) : undefined,
        payout: payout ? parseFloat(payout) : undefined,
        discount: discount !== undefined ? (discount ? parseFloat(discount) : null) : undefined,
        notes,
        payoutMethod,
        ...(status !== undefined && { status }),
        updatedAt: new Date(),
      },
      include: {
        store: true,
        inventoryItem: {
          include: {
            product: true,
          },
        },
      },
    });

    return NextResponse.json(updatedSale);
  } catch (error) {
    console.error('Sale update error:', error);
    return NextResponse.json(
      { error: `Failed to update sale: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}

// DELETE /api/sales/[id] - Soft delete a sale
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existingSale = await prisma.sale.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!existingSale) {
      return NextResponse.json(
        { error: 'Sale not found' },
        { status: 404 }
      );
    }

    // Soft delete by setting deletedAt
    await prisma.sale.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ message: 'Sale deleted successfully' });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to delete sale' },
      { status: 500 }
    );
  }
} 