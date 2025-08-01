import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { verifySupabaseAuth } from '@/lib/supabase-auth';

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

export async function GET(request: NextRequest) {
  try {
    const { user, isValid } = await verifySupabaseAuth(request);
    if (!isValid || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - Authentication required' },
        { status: 401 }
      );
    }

    const sales = await prisma.sale.findMany({
      where: {
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
      orderBy: {
        saleDate: 'desc',
      },
    });

    // Fetch store inventory data for each sale
    const salesWithStoreInventory = await Promise.all(
      sales.map(async (sale) => {
        const storeInventory = await prisma.storeInventory.findUnique({
          where: {
            storeId_inventoryItemId: {
              storeId: sale.storeId,
              inventoryItemId: sale.inventoryItemId,
            },
          },
        });
        
        return {
          ...sale,
          inventoryItem: {
            ...sale.inventoryItem,
            storeSku: storeInventory?.storeSku || null,
          },
        };
      })
    );



    return NextResponse.json(salesWithStoreInventory);
  } catch (error) {
    
    return NextResponse.json(
      { error: 'Failed to fetch sales' },
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
      storeId,
      inventoryItemId,
      cost,
      payout,
      discount = 0,
      quantity,
      saleDate,
      notes,
      payoutMethod,
    } = body;

    // Validate required fields
    if (!storeId || !inventoryItemId || !cost || !payout || !quantity) {
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

    // Check if store inventory exists and has sufficient quantity
    const storeInventory = await prisma.storeInventory.findUnique({
      where: {
        storeId_inventoryItemId: {
          storeId,
          inventoryItemId
        }
      }
    });

    if (!storeInventory) {
      return NextResponse.json(
        { error: 'This item is not available at the selected store' },
        { status: 400 }
      );
    }

    if (storeInventory.quantity < quantity) {
      return NextResponse.json(
        { error: `Insufficient store inventory. Available: ${storeInventory.quantity}, Requested: ${quantity}` },
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
        payoutMethod,
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

    // Update store inventory quantity and status to SOLD
    await prisma.storeInventory.update({
      where: {
        storeId_inventoryItemId: {
          storeId,
          inventoryItemId
        }
      },
      data: {
        quantity: {
          decrement: quantity,
        },
        status: 'SOLD',
      },
    });

    return NextResponse.json(sale, { status: 201 });
  } catch (error) {
    
    return NextResponse.json(
      { error: 'Failed to create sale' },
      { status: 500 }
    );
  }
} 
