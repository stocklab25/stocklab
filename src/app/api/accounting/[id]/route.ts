import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { verifySupabaseAuth } from '@/lib/supabase-auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const { user, isValid } = await verifySupabaseAuth(request);
    if (!isValid || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const accounting = await prisma.accounting.findUnique({
      where: { 
        id: id,
        deletedAt: null 
      }
    });

    if (!accounting) {
      return NextResponse.json(
        { error: 'Accounting entry not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(accounting);
  } catch (error) {
    console.error('Error fetching accounting entry:', error);
    return NextResponse.json(
      { error: 'Failed to fetch accounting entry' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const { user, isValid } = await verifySupabaseAuth(request);
    if (!isValid || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { transactionDate, name, description, accountType, amount, status } = body;

    if (!transactionDate || !name || !description || !accountType || !amount) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    // Check if the accounting entry exists
    const existingEntry = await prisma.accounting.findUnique({
      where: { 
        id: id,
        deletedAt: null 
      }
    });

    if (!existingEntry) {
      return NextResponse.json(
        { error: 'Accounting entry not found' },
        { status: 404 }
      );
    }

    const updatedAccounting = await prisma.accounting.update({
      where: { id: id },
      data: {
        transactionDate: new Date(transactionDate),
        name,
        description,
        accountType,
        amount: parseFloat(amount),
        status: status || 'PENDING',
        updatedAt: new Date()
      }
    });

    return NextResponse.json(updatedAccounting);
  } catch (error) {
    console.error('Error updating accounting entry:', error);
    return NextResponse.json(
      { error: 'Failed to update accounting entry' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const { user, isValid } = await verifySupabaseAuth(request);
    if (!isValid || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if the accounting entry exists
    const existingEntry = await prisma.accounting.findUnique({
      where: { 
        id: id,
        deletedAt: null 
      }
    });

    if (!existingEntry) {
      return NextResponse.json(
        { error: 'Accounting entry not found' },
        { status: 404 }
      );
    }

    // Soft delete the accounting entry
    await prisma.accounting.update({
      where: { id: id },
      data: {
        deletedAt: new Date()
      }
    });

    return NextResponse.json({ message: 'Accounting entry deleted successfully' });
  } catch (error) {
    console.error('Error deleting accounting entry:', error);
    return NextResponse.json(
      { error: 'Failed to delete accounting entry' },
      { status: 500 }
    );
  }
} 