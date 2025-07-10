import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, getTokenFromHeader } from '@/lib/auth';
import prisma from '@/lib/db';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

function checkAuth(req: NextRequest): { user: User | null; isValid: boolean } {
  const token = getTokenFromHeader(req);
  if (!token) {
    console.error('No token provided');
    return { user: null, isValid: false };
  }
  const user = verifyToken(token);
  if (!user) {
    console.error('Invalid or expired token');
    return { user: null, isValid: false };
  }
  return { user, isValid: true };
}

export async function GET(req: NextRequest) {
  if (!checkAuth(req).isValid) {
    return NextResponse.json(
      { error: 'Unauthorized - Authentication required' },
      { status: 401 }
    );
  }
  try {
    const purchaseOrders = await prisma.purchase.findMany({
      where: {
        deletedAt: null,
        inventoryItem: {
          deletedAt: null,
          product: {
            deletedAt: null
          }
        }
      },
      select: {
        id: true,
        r3vPurchaseOrderNumber: true,
        inventoryItemId: true,
        vendor: true,
        paymentMethod: true,
        orderNumber: true,
        quantity: true,
        cost: true,
        purchaseDate: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
        inventoryItem: {
          select: {
            id: true,
            sku: true,
            size: true,
            condition: true,
            product: {
              select: {
                id: true,
                brand: true,
                name: true,
                color: true,
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    return NextResponse.json({
      data: purchaseOrders,
      success: true
    });
  } catch (error) {
    console.error('Error fetching purchase orders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch purchase orders' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const { user, isValid } = checkAuth(req);
  if (!isValid || !user) {
    return NextResponse.json(
      { error: 'Unauthorized - Authentication required' },
      { status: 401 }
    );
  }
  try {
    const data = await req.json();
    if (!data.inventoryItemId || !data.vendor || !data.paymentMethod || !data.quantity || !data.cost) {
      return NextResponse.json(
        { error: 'Missing required fields: inventoryItemId, vendor, paymentMethod, quantity, cost' },
        { status: 400 }
      );
    }
    const lastPurchase = await prisma.purchase.findFirst({
      orderBy: {
        r3vPurchaseOrderNumber: 'desc',
      },
      select: {
        r3vPurchaseOrderNumber: true,
      },
    });
    let r3vPurchaseOrderNumber = 'R3VPO1';
    if (lastPurchase) {
      const lastNumber = parseInt(lastPurchase.r3vPurchaseOrderNumber.replace('R3VPO', ''));
      const nextNumber = lastNumber + 1;
      r3vPurchaseOrderNumber = `R3VPO${nextNumber}`;
    }
    const purchaseOrder = await prisma.purchase.create({
      data: {
        r3vPurchaseOrderNumber,
        inventoryItemId: data.inventoryItemId,
        vendor: data.vendor,
        paymentMethod: data.paymentMethod,
        orderNumber: data.orderNumber,
        quantity: parseInt(data.quantity),
        cost: parseFloat(data.cost),
        purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : new Date(),
        notes: data.notes
      },
      include: {
        inventoryItem: {
          include: {
            product: true
          }
        }
      }
    });
    return NextResponse.json({
      data: purchaseOrder,
      success: true,
      message: 'Purchase order created successfully'
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating purchase order:', error);
    return NextResponse.json(
      { error: 'Failed to create purchase order' },
      { status: 500 }
    );
  }
} 