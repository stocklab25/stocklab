import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import prisma from '@/lib/db';

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

export async function GET(req: NextRequest) {
  // Check authentication
  if (!checkAuth(req)) {
    return NextResponse.json(
      { error: 'Unauthorized - Authentication required' },
      { status: 401 }
    );
  }

  try {
    const inventoryItems = await prisma.inventoryItem.findMany({
      where: {
        deletedAt: null, // Only show non-deleted items
        product: {
          deletedAt: null // Only show items from non-deleted products
        }
      },
      include: {
        product: {
          select: {
            id: true,
            brand: true,
            name: true,
            color: true,
            sku: true,
            quantity: true,
            createdAt: true,
            updatedAt: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    return NextResponse.json({
      data: inventoryItems,
      success: true
    });
  } catch (error) {
    console.error('Error fetching inventory:', error);
    return NextResponse.json(
      { error: 'Failed to fetch inventory' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  // Check authentication
  if (!checkAuth(req)) {
    return NextResponse.json(
      { error: 'Unauthorized - Authentication required' },
      { status: 401 }
    );
  }

  try {
    const data = await req.json();
    
    // Validate required fields
    if (!data.productId || !data.sku || !data.size || !data.condition || !data.cost || !data.consigner || !data.consignDate || !data.status) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    const newItem = await prisma.inventoryItem.create({
      data: {
        productId: data.productId,
        sku: data.sku,
        size: data.size,
        condition: data.condition,
        cost: parseFloat(data.cost),
        consigner: data.consigner,
        consignDate: new Date(data.consignDate),
        status: data.status,
        location: data.location,
      },
      include: {
        product: true
      }
    });
    
    return NextResponse.json({
      data: newItem,
      success: true
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating inventory item:', error);
    return NextResponse.json(
      { error: 'Failed to create inventory item' },
      { status: 500 }
    );
  }
} 