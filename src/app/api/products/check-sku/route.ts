import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sku = searchParams.get('sku');

    if (!sku) {
      return NextResponse.json(
        { error: 'SKU parameter is required' },
        { status: 400 }
      );
    }

    const existingProduct = await prisma.product.findUnique({
      where: { sku },
      select: { id: true }
    });

    return NextResponse.json({
      exists: !!existingProduct,
      success: true
    });
  } catch (error) {
    console.error('Error checking SKU:', error);
    return NextResponse.json(
      { error: 'Failed to check SKU' },
      { status: 500 }
    );
  }
} 