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

    const inventoryItems = await prisma.inventoryItem.findMany({
      where: {
        deletedAt: null
      },
      select: {
        id: true,
        sku: true,
        size: true,
        condition: true,
        product: {
          select: {
            brand: true,
            name: true,
            color: true
          }
        }
      },
      orderBy: {
        sku: 'asc'
      }
    });

    return NextResponse.json({
      success: true,
      data: inventoryItems
    });
  } catch (error) {
    
    return NextResponse.json(
      { error: 'Failed to fetch inventory item SKUs' },
      { status: 500 }
    );
  }
} 
