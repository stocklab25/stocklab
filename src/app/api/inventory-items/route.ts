import { NextRequest, NextResponse } from 'next/server';
import { verifySupabaseAuth } from '@/lib/supabase-auth';
import prisma from '@/lib/db';

// GET /api/inventory-items - Get all inventory items
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
    const sku = searchParams.get('sku');
    const productId = searchParams.get('productId');

    const whereClause: any = {
      deletedAt: null
    };

    if (sku) {
      whereClause.sku = sku;
    }

    if (productId) {
      whereClause.productId = productId;
    }

    const inventoryItems = await prisma.inventoryItem.findMany({
      where: whereClause,
      select: {
        id: true,
        productId: true,
        sku: true,
        stocklabSku: true,
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
            sku: true
          }
        }
      },
      orderBy: {
        product: {
          brand: 'asc'
        }
      }
    });

    return NextResponse.json(inventoryItems);
  } catch (error: any) {

    // Check if it's a database connection error
    if (error?.code === 'P1001' || error?.message?.includes('database server')) {
      return NextResponse.json(
        { error: 'Database connection failed. Please check your database configuration.' },
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch inventory items' },
      { status: 500 }
    );
  }
} 
