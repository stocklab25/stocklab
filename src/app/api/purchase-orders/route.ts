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

    const purchaseOrders = await prisma.purchase.findMany({
      where: { deletedAt: null },
      include: {
        inventoryItem: {
          include: {
            product: true,
          },
        },
      },
      orderBy: { purchaseDate: 'desc' },
    });

    return NextResponse.json(purchaseOrders);
  } catch (error) {
    
    return NextResponse.json(
      { error: 'Failed to fetch purchase orders' },
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
      vendor,
      paymentMethod,
      orderNumber,
      quantity,
      cost,
      purchaseDate,
      notes,
    } = body;

    // Validate required fields
    if (!inventoryItemId || !vendor || !paymentMethod || !quantity || !cost) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
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

    // Generate unique R3V purchase order number if not provided
    let r3vPurchaseOrderNumber = orderNumber;
    if (!r3vPurchaseOrderNumber) {
      const timestamp = Date.now().toString();
      const random = Math.random().toString(36).substring(2, 8).toUpperCase();
      r3vPurchaseOrderNumber = `R3V-${timestamp}-${random}`;
    }

    // Check if R3V purchase order number already exists
    const existingPurchase = await prisma.purchase.findUnique({
      where: { r3vPurchaseOrderNumber },
    });

    if (existingPurchase) {
      return NextResponse.json(
        { error: 'R3V purchase order number already exists' },
        { status: 400 }
      );
    }

    const purchaseOrder = await prisma.purchase.create({
      data: {
        inventoryItemId,
        vendor,
        paymentMethod,
        orderNumber,
        quantity: parseInt(quantity),
        cost: parseFloat(cost),
        purchaseDate: purchaseDate ? new Date(purchaseDate) : new Date(),
        notes,
        r3vPurchaseOrderNumber,
      },
      include: {
        inventoryItem: {
          include: {
            product: true,
          },
        },
      },
    });

    return NextResponse.json(purchaseOrder, { status: 201 });
  } catch (error) {
    
    return NextResponse.json(
      { error: 'Failed to create purchase order' },
      { status: 500 }
    );
  }
} 
