import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { verifySupabaseAuth } from '@/lib/supabase-auth';
import { generateStockLabSku } from '@/utils/sku-generator';

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
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const brand = searchParams.get('brand') || '';

    const showDeleted = searchParams.get('showDeleted') === 'true';

    const skip = (page - 1) * limit;

    // Build where clause
    const whereClause: Record<string, unknown> = {};

    if (!showDeleted) {
      whereClause.deletedAt = null;
    }

    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { brand: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { stocklabSku: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (brand) {
      whereClause.brand = { contains: brand, mode: 'insensitive' };
    }



    // Get products with pagination and error handling
    let products;
    try {
      products = await prisma.product.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          brand: true,
          name: true,
          sku: true,
          itemType: true,
          deletedAt: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    } catch (dbError) {
      
      const errorMessage = dbError instanceof Error ? dbError.message : String(dbError);
      if (errorMessage.includes('prepared statement') || errorMessage.includes('connection')) {
        await prisma.$disconnect();
        await prisma.$connect();
        // Retry once
        products = await prisma.product.findMany({
          where: whereClause,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            brand: true,
            name: true,
            sku: true,
            itemType: true,
            deletedAt: true,
            createdAt: true,
            updatedAt: true,
          },
        });
      } else {
        throw dbError;
      }
    }

    // Get total count for pagination with error handling
    let total;
    try {
      total = await prisma.product.count({
        where: whereClause,
      });
    } catch (countError) {
      
      const errorMessage = countError instanceof Error ? countError.message : String(countError);
      if (errorMessage.includes('prepared statement') || errorMessage.includes('connection')) {
        await prisma.$disconnect();
        await prisma.$connect();
        // Retry once
        total = await prisma.product.count({
          where: whereClause,
        });
      } else {
        throw countError;
      }
    }

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      data: products,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    
    return NextResponse.json(
      { error: 'Internal server error' },
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

    const data = await request.json();

    // Validate required fields
    if (!data.brand || !data.name) {
      return NextResponse.json(
        { error: 'Brand and name are required' },
        { status: 400 }
      );
    }

    // Check if SKU is unique (if provided)
    if (data.sku) {
      const existingProduct = await prisma.product.findFirst({
        where: {
          sku: data.sku,
          deletedAt: null,
        },
      });

      if (existingProduct) {
        return NextResponse.json(
          { error: 'SKU already exists' },
          { status: 400 }
        );
      }
    }

    const product = await prisma.product.create({
      data: {
        brand: data.brand,
        name: data.name,
        sku: data.sku,
        itemType: data.itemType || 'SHOE', // Default to SHOE if not provided
      },
    });

    return NextResponse.json({
      ...product,
      message: `Product created successfully. Add inventory items to manage stock.`
    }, { status: 201 });
  } catch (error) {
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Soft delete endpoint
export async function DELETE(req: NextRequest) {
  try {
    const { user, isValid } = await verifySupabaseAuth(req);
    if (!isValid || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      );
    }

    // Soft delete the product
    const deletedProduct = await prisma.product.update({
      where: { id },
      data: { 
        deletedAt: new Date(),
        updatedAt: new Date()
      }
    });
    
    return NextResponse.json({
      data: deletedProduct,
      success: true,
      message: 'Product soft deleted successfully'
    });
  } catch (error) {
    
    return NextResponse.json(
      { error: 'Failed to delete product' },
      { status: 500 }
    );
  }
}
