import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET() {
  try {
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
    console.error('Error fetching inventory item SKUs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch inventory item SKUs' },
      { status: 500 }
    );
  }
} 