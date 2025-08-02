import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { verifySupabaseAuth } from '@/lib/supabase-auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { user, isValid } = await verifySupabaseAuth(request);
    if (!isValid || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const expense = await prisma.expense.findUnique({
      where: { 
        id: id,
        deletedAt: null 
      },
      include: {
        card: true,
      }
    });

    if (!expense) {
      return NextResponse.json(
        { error: 'Expense not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(expense);
  } catch (error) {
    console.error('Error fetching expense:', error);
    return NextResponse.json(
      { error: 'Failed to fetch expense' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { user, isValid } = await verifySupabaseAuth(request);
    if (!isValid || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { transactionDate, description, amount, category, cardId } = body;

    if (!transactionDate || !description || !amount || !category) {
      return NextResponse.json(
        { error: 'Transaction date, description, amount, and category are required' },
        { status: 400 }
      );
    }

    // Check if the expense exists
    const existingExpense = await prisma.expense.findUnique({
      where: { 
        id: id,
        deletedAt: null 
      }
    });

    if (!existingExpense) {
      return NextResponse.json(
        { error: 'Expense not found' },
        { status: 404 }
      );
    }

    const updatedExpense = await prisma.expense.update({
      where: { id: id },
      data: {
        transactionDate: new Date(transactionDate),
        description,
        amount: parseFloat(amount),
        category,
        cardId: cardId || undefined,
        updatedAt: new Date()
      },
      include: {
        card: true,
      }
    });

    return NextResponse.json(updatedExpense);
  } catch (error) {
    console.error('Error updating expense:', error);
    return NextResponse.json(
      { error: 'Failed to update expense' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { user, isValid } = await verifySupabaseAuth(request);
    if (!isValid || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if the expense exists
    const existingExpense = await prisma.expense.findUnique({
      where: { 
        id: id,
        deletedAt: null 
      }
    });

    if (!existingExpense) {
      return NextResponse.json(
        { error: 'Expense not found' },
        { status: 404 }
      );
    }

    // Soft delete the expense
    await prisma.expense.update({
      where: { id: id },
      data: {
        deletedAt: new Date()
      }
    });

    return NextResponse.json({ message: 'Expense deleted successfully' });
  } catch (error) {
    console.error('Error deleting expense:', error);
    return NextResponse.json(
      { error: 'Failed to delete expense' },
      { status: 500 }
    );
  }
} 