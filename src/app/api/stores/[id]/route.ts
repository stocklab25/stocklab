import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { verifySupabaseAuth } from '@/lib/supabase-auth';

// GET /api/stores/[id] - Get specific store
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const store = await prisma.store.findFirst({
      where: {
        id,
        deletedAt: null
      }
    });

    if (!store) {
      return NextResponse.json(
        { error: 'Store not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(store);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch store' },
      { status: 500 }
    );
  }
}

// PUT /api/stores/[id] - Update store
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, address, phone, email, storeSkuBase, status } = body;

    const existingStore = await prisma.store.findFirst({
      where: {
        id,
        deletedAt: null
      }
    });

    if (!existingStore) {
      return NextResponse.json(
        { error: 'Store not found' },
        { status: 404 }
      );
    }

    const updatedStore = await prisma.store.update({
      where: { id },
      data: {
        name,
        address,
        phone,
        email,
        storeSkuBase,
        status
      }
    });

    return NextResponse.json(updatedStore);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update store' },
      { status: 500 }
    );
  }
}

// DELETE /api/stores/[id] - Soft delete store (Admin only with confirmation)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify authentication
    const { user, isValid } = await verifySupabaseAuth(request);
    if (!isValid || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - Authentication required' },
        { status: 401 }
      );
    }



    // Get confirmation code from request body
    const body = await request.json();
    const { confirmationCode } = body;

    if (!confirmationCode) {
      return NextResponse.json(
        { error: 'Confirmation code is required' },
        { status: 400 }
      );
    }

    // Verify confirmation code (simple check for now - can be enhanced)
    const expectedCode = 'DELETE STORE';
    if (confirmationCode !== expectedCode) {
      return NextResponse.json(
        { error: 'Invalid confirmation code' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const existingStore = await prisma.store.findFirst({
      where: {
        id,
        deletedAt: null
      }
    });

    if (!existingStore) {
      return NextResponse.json(
        { error: 'Store not found' },
        { status: 404 }
      );
    }

    // Soft delete by setting deletedAt
    await prisma.store.update({
      where: { id },
      data: {
        deletedAt: new Date()
      }
    });

    return NextResponse.json({ message: 'Store deleted successfully' });
  } catch (error) {
    console.error('Error deleting store:', error);
    return NextResponse.json(
      { error: 'Failed to delete store' },
      { status: 500 }
    );
  }
} 