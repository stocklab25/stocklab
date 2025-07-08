import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

// GET /api/stores/[id] - Get specific store
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const store = await prisma.store.findFirst({
      where: {
        id: params.id,
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
    console.error('Error fetching store:', error);
    return NextResponse.json(
      { error: 'Failed to fetch store' },
      { status: 500 }
    );
  }
}

// PUT /api/stores/[id] - Update store
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { name, address, phone, email, status } = body;

    const existingStore = await prisma.store.findFirst({
      where: {
        id: params.id,
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
      where: { id: params.id },
      data: {
        name,
        address,
        phone,
        email,
        status
      }
    });

    return NextResponse.json(updatedStore);
  } catch (error) {
    console.error('Error updating store:', error);
    return NextResponse.json(
      { error: 'Failed to update store' },
      { status: 500 }
    );
  }
}

// DELETE /api/stores/[id] - Soft delete store
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const existingStore = await prisma.store.findFirst({
      where: {
        id: params.id,
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
      where: { id: params.id },
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