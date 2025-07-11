import { NextRequest, NextResponse } from 'next/server';
import { verifySupabaseAuth } from '@/lib/supabase-auth';
import prisma from '@/lib/db';
import { purchaseService } from '../../../../prisma/services/purchase.service';
import { InventoryService } from '../../../../prisma/services/inventory.service';

export async function GET(req: NextRequest) {
  try {
    const { user, isValid } = await verifySupabaseAuth(req);
    if (!isValid || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - Authentication required' },
        { status: 401 }
      );
    }

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
    
    return NextResponse.json(
      { error: 'Failed to fetch inventory' },
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

    const data = await req.json();
    
    // Validate required fields
    if (!data.productId || !data.sku || !data.size || !data.condition || !data.cost || !data.status || !data.vendor || !data.paymentMethod) {
      return NextResponse.json(
        { error: 'Missing required fields: productId, sku, size, condition, cost, status, vendor, paymentMethod' },
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

    // Use the inventory service to create inventory item with initial stock
    const result = await InventoryService.createInventoryItemWithInitialStock({
      productId: data.productId,
      sku: data.sku,
      size: data.size,
      condition: data.condition,
      cost: parseFloat(data.cost),
      status: data.status,
      quantity: data.quantity || 1,
      vendor: data.vendor,
      paymentMethod: data.paymentMethod,
      userId: dbUser.id
    });

    if (!result.success || !result.data) {
      return NextResponse.json(
        { error: result.error || 'Failed to create inventory item' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      data: result.data.inventoryItem,
      transaction: result.data.transaction,
      purchase: result.data.purchase,
      success: true,
      message: 'Inventory item created with initial transaction'
    }, { status: 201 });
  } catch (error) {

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
