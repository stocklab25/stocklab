import { NextRequest, NextResponse } from 'next/server';
import { verifySupabaseAuth } from '@/lib/supabase-auth';
import prisma from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { user, isValid } = await verifySupabaseAuth(request);
    
    if (!isValid || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const vendor = searchParams.get('vendor');

    const where: any = { deletedAt: null };
    
    if (status) {
      where.status = status;
    }
    
    if (vendor) {
      where.vendorName = { contains: vendor, mode: 'insensitive' };
    }

    const purchaseOrders = await prisma.purchaseOrder.findMany({
      where,
      include: {
        purchaseOrderItems: {
          include: {
            product: true,
          },
        },
        inventoryItems: {
          include: {
            product: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(purchaseOrders);
  } catch (error) {
    console.error('Error fetching purchase orders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch purchase orders' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, isValid } = await verifySupabaseAuth(request);
    if (!isValid || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      vendorName,
      orderNumber,
      orderDate,
      deliveryDate,
      status = 'DRAFT',
      totalAmount,
      notes,
      items,
    } = body;

    if (!vendorName || !items || items.length === 0) {
      return NextResponse.json(
        { error: 'Vendor name and items are required' },
        { status: 400 }
      );
    }

    const purchaseOrder = await prisma.purchaseOrder.create({
      data: {
        vendorName,
        orderNumber,
        orderDate: orderDate ? new Date(orderDate) : new Date(),
        deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
        status,
        totalAmount: parseFloat(totalAmount),
        notes,
        purchaseOrderItems: {
          create: items.map((item: any) => ({
            productId: item.productId,
            size: item.size,
            condition: item.condition || 'NEW',
            quantityOrdered: parseInt(item.quantityOrdered),
            unitCost: parseFloat(item.unitCost),
            totalCost: parseFloat(item.totalCost),
          })),
        },
      },
      include: {
        purchaseOrderItems: {
          include: {
            product: true,
          },
        },
      },
    });

    return NextResponse.json(purchaseOrder, { status: 201 });
  } catch (error) {
    console.error('Error creating purchase order:', error);
    return NextResponse.json(
      { error: 'Failed to create purchase order' },
      { status: 500 }
    );
  }
} 
