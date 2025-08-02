import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { verifySupabaseAuth } from '@/lib/supabase-auth';

export async function GET(req: NextRequest) {
  try {
    const { user, isValid } = await verifySupabaseAuth(req);
    if (!isValid || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - Authentication required' },
        { status: 401 }
      );
    }

    const expenses = await prisma.expense.findMany({
      where: { deletedAt: null },
      orderBy: { transactionDate: 'desc' },
      include: {
        card: true,
      },
    });
    return NextResponse.json({ data: expenses, success: true });
  } catch (error) {
    
    return NextResponse.json({ error: 'Failed to fetch expenses' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, isValid } = await verifySupabaseAuth(req);
    if (!isValid || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - Authentication required' },
        { status: 401 }
      );
    }

    const { transactionDate, description, amount, category, cardId } = await req.json();
    if (!transactionDate || !description || !amount || !category) {
      return NextResponse.json({ error: 'Transaction date, description, amount, and category are required' }, { status: 400 });
    }
    const expense = await prisma.expense.create({
      data: {
        transactionDate: new Date(transactionDate),
        description,
        amount: parseFloat(amount),
        category,
        cardId: cardId || undefined,
      },
      include: {
        card: true,
      },
    });
    return NextResponse.json({ data: expense, success: true, message: 'Expense created' }, { status: 201 });
  } catch (error) {
    
    return NextResponse.json({ error: 'Failed to create expense' }, { status: 500 });
  }
} 
