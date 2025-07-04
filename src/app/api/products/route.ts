import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import { verifyToken } from '@/lib/auth';

// Load environment variables
dotenv.config();

const prisma = new PrismaClient();

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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const brand = searchParams.get('brand') || '';
    const color = searchParams.get('color') || '';
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
      ];
    }

    if (brand) {
      whereClause.brand = { contains: brand, mode: 'insensitive' };
    }

    if (color) {
      whereClause.color = { contains: color, mode: 'insensitive' };
    }

    // Get products with pagination
    const products = await prisma.product.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    // Get total count for pagination
    const total = await prisma.product.count({
      where: whereClause,
    });

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
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
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
        color: data.color,
        sku: data.sku,
        quantity: data.quantity ? parseInt(data.quantity) : 0,
      },
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error('Error creating product:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Soft delete endpoint
export async function DELETE(req: NextRequest) {
  // Check authentication
  if (!checkAuth(req)) {
    return NextResponse.json(
      { error: 'Unauthorized - Authentication required' },
      { status: 401 }
    );
  }

  try {
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
    console.error('Error soft deleting product:', error);
    return NextResponse.json(
      { error: 'Failed to delete product' },
      { status: 500 }
    );
  }
} 