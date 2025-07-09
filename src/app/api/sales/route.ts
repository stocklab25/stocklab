import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

// Function to generate a unique order number
async function generateUniqueOrderNumber(): Promise<string> {
  const timestamp = Date.now().toString();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  const orderNumber = `${timestamp}-${random}`;
  
  // Check if this order number already exists
  const existingSale = await prisma.sale.findUnique({
    where: { orderNumber }
  });
  
  if (existingSale) {
    // If it exists, try again with a different random string
    return generateUniqueOrderNumber();
  }
  
  return orderNumber;
}

export async function GET() {
  try {
    const sales = await prisma.sale.findMany({
      include: {
        store: true,
        inventoryItem: {
          include: {
            product: true,
          },
        },
      },
      orderBy: {
        saleDate: 'desc',
      },
    });

    return NextResponse.json(sales);
  } catch (error) {
    console.error('Error fetching sales:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sales' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      storeId,
      inventoryItemId,
      cost,
      payout,
      discount = 0,
      quantity,
      saleDate,
      notes,
    } = body;

    // Validate required fields
    if (!storeId || !inventoryItemId || !cost || !payout || !quantity) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if inventory item exists and has sufficient quantity
    const inventoryItem = await prisma.inventoryItem.findUnique({
      where: { id: inventoryItemId },
    });

    if (!inventoryItem) {
      return NextResponse.json(
        { error: 'Inventory item not found' },
        { status: 404 }
      );
    }

    if (inventoryItem.quantity < quantity) {
      return NextResponse.json(
        { error: 'Insufficient inventory quantity' },
        { status: 400 }
      );
    }

    // Generate unique order number
    const orderNumber = await generateUniqueOrderNumber();

    // Create the sale
    const sale = await prisma.sale.create({
      data: {
        storeId,
        inventoryItemId,
        orderNumber,
        cost: parseFloat(cost).toFixed(2),
        payout: parseFloat(payout).toFixed(2),
        discount: discount ? parseFloat(discount).toFixed(2) : null,
        quantity,
        saleDate: saleDate ? new Date(saleDate) : new Date(),
        notes,
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

    // Update inventory quantity
    await prisma.inventoryItem.update({
      where: { id: inventoryItemId },
      data: {
        quantity: {
          decrement: quantity,
        },
      },
    });

    return NextResponse.json(sale, { status: 201 });
  } catch (error) {
    console.error('Error creating sale:', error);
    return NextResponse.json(
      { error: 'Failed to create sale' },
      { status: 500 }
    );
  }
} 