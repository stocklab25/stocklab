import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyToken } from '@/lib/auth';

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

export async function GET(req: NextRequest) {
  // Check authentication
  if (!checkAuth(req)) {
    return NextResponse.json(
      { error: 'Unauthorized - Authentication required' },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const showArchived = searchParams.get('archived') === 'true';

    const products = await prisma.product.findMany({
      where: showArchived 
        ? { deletedAt: { not: null } } // Show archived products
        : { deletedAt: null }, // Show active products
      orderBy: {
        name: 'asc'
      }
    });
    
    return NextResponse.json({
      data: products,
      success: true
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  // Check authentication
  if (!checkAuth(req)) {
    return NextResponse.json(
      { error: 'Unauthorized - Authentication required' },
      { status: 401 }
    );
  }

  try {
    const data = await req.json();
    
    const newProduct = await prisma.product.create({
      data: {
        brand: data.brand,
        name: data.name,
        color: data.color,
        sku: data.sku,
      }
    });
    
    return NextResponse.json({
      data: newProduct,
      success: true
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating product:', error);
    
    // Handle unique constraint violation
    if (error.code === 'P2002' && error.meta?.target?.includes('sku')) {
      return NextResponse.json(
        { error: 'SKU already exists. Please choose a different SKU.' },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to create product' },
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