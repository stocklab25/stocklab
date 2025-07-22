import { NextRequest, NextResponse } from 'next/server';
import { verifySupabaseAuth } from '@/lib/supabase-auth';
import prisma from '@/lib/db';

// GET /api/stores/inventory - Get all inventory across all stores
export async function GET(request: NextRequest) {
  try {
    const { user, isValid } = await verifySupabaseAuth(request);
    if (!isValid || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - Authentication required' },
        { status: 401 }
      );
    }

    // Get all inventory items across all stores (including sold items with quantity 0)
    const allStoreInventory = await prisma.storeInventory.findMany({
      where: {
        deletedAt: null
      },
      include: {
        inventoryItem: {
          include: {
            product: true
          }
        },
        store: true
      },
      orderBy: [
        {
          store: {
            name: 'asc'
          }
        },
        {
          inventoryItem: {
            product: {
              brand: 'asc'
            }
          }
        }
      ]
    });

    return NextResponse.json(allStoreInventory);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch all store inventory' },
      { status: 500 }
    );
  }
} 