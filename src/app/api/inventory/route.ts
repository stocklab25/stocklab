import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import prisma from '@/lib/db';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

// Auth check function
function checkAuth(req: NextRequest): { user: User | null; isValid: boolean } {
  // Check for auth token in headers
  const authHeader = req.headers.get('authorization');
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    const user = verifyToken(token);
    return { user, isValid: !!user };
  }
  
  // Check for auth token in cookies
  const authCookie = req.cookies.get('authToken')?.value;
  if (authCookie) {
    const user = verifyToken(authCookie);
    return { user, isValid: !!user };
  }
  
  return { user: null, isValid: false };
}

export async function GET(req: NextRequest) {
  // Check authentication
  if (!checkAuth(req).isValid) {
    return NextResponse.json(
      { error: 'Unauthorized - Authentication required' },
      { status: 401 }
    );
  }

  try {
    let inventoryItems;
    try {
      inventoryItems = await prisma.inventoryItem.findMany({
        where: {
          deletedAt: null, // Only show non-deleted items
          product: {
            deletedAt: null // Only show items from non-deleted products
          }
        },
        select: {
          id: true,
          productId: true,
          sku: true,
          size: true,
          condition: true,
          cost: true,
          consigner: true,
          consignDate: true,
          status: true,
          quantity: true,
          createdAt: true,
          updatedAt: true,
          product: {
            select: {
              id: true,
              brand: true,
              name: true,
              color: true,
              sku: true,
              createdAt: true,
              updatedAt: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
    } catch (dbError) {
      console.error('Database error fetching inventory:', dbError);
      const errorMessage = dbError instanceof Error ? dbError.message : String(dbError);
      if (errorMessage.includes('prepared statement') || errorMessage.includes('connection')) {
        await prisma.$disconnect();
        await prisma.$connect();
        // Retry once
        inventoryItems = await prisma.inventoryItem.findMany({
          where: {
            deletedAt: null,
            product: {
              deletedAt: null
            }
          },
          select: {
            id: true,
            productId: true,
            sku: true,
            size: true,
            condition: true,
            cost: true,
            consigner: true,
            consignDate: true,
            status: true,
            quantity: true,
            createdAt: true,
            updatedAt: true,
            product: {
              select: {
                id: true,
                brand: true,
                name: true,
                color: true,
                sku: true,
                createdAt: true,
                updatedAt: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        });
      } else {
        throw dbError;
      }
    }
    
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
  const { user, isValid } = checkAuth(req);
  if (!isValid || !user) {
    return NextResponse.json(
      { error: 'Unauthorized - Authentication required' },
      { status: 401 }
    );
  }

  try {
    const data = await req.json();
    
    // Validate required fields
    if (!data.productId || !data.sku || !data.size || !data.condition || !data.cost || !data.payout || !data.consigner || !data.consignDate || !data.status) {
      return NextResponse.json(
        { error: 'Missing required fields: productId, sku, size, condition, cost, payout, consigner, consignDate, status' },
        { status: 400 }
      );
    }
    
    // Verify user exists in database
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id }
    });

    if (!dbUser) {
      return NextResponse.json(
        { error: 'User not found in database' },
        { status: 404 }
      );
    }

    // Create inventory item and initial transaction in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create the inventory item
      const newItem = await tx.inventoryItem.create({
      data: {
        productId: data.productId,
        sku: data.sku,
        size: data.size,
        condition: data.condition,
        cost: parseFloat(data.cost),
          payout: parseFloat(data.payout),
        consigner: data.consigner,
        consignDate: new Date(data.consignDate),
        status: data.status,
  
          quantity: data.quantity || 1, // Default to 1 if not specified
      },
      include: {
        product: true
      }
      });

      // 2. Create initial stock transaction
      const initialTransaction = await tx.stockTransaction.create({
        data: {
          type: 'IN',
          quantity: newItem.quantity,
          date: new Date(data.consignDate),
          notes: `Initial consignment - ${newItem.product.name} ${newItem.size} (${newItem.condition})`,
          inventoryItemId: newItem.id,
          userId: dbUser.id, // Use the verified database user ID

        },
        include: {
          InventoryItem: {
            include: {
              product: true
            }
          },
          user: true
        }
      });

      return { newItem, initialTransaction };
    });
    
    return NextResponse.json({
      data: result.newItem,
      transaction: result.initialTransaction,
      success: true,
      message: 'Inventory item created with initial transaction'
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating inventory item:', error);
    
    // Check if it's a foreign key constraint error
    if (error instanceof Error && error.message.includes('Foreign key constraint')) {
      return NextResponse.json(
        { error: 'Invalid user or product reference' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to create inventory item' },
      { status: 500 }
    );
  }
} 