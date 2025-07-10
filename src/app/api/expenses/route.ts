import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getTokenFromHeader, verifyToken } from '@/lib/auth';

function checkAuth(req: NextRequest) {
  const token = getTokenFromHeader(req);
  if (!token) {
    console.error('No token provided');
    return { user: null, isValid: false };
  }
  const user = verifyToken(token);
  if (!user) {
    console.error('Invalid or expired token');
    return { user: null, isValid: false };
  }
  return { user, isValid: true };
}

export async function GET(req: NextRequest) {
  if (!checkAuth(req).isValid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const expenses = await prisma.expense.findMany({
      where: { deletedAt: null },
      orderBy: { transactionDate: 'desc' },
      include: {
        card: true,
      },
    });
    return NextResponse.json({ data: expenses, success: true });
  } catch (error) {
    console.error('Error fetching expenses:', error);
    return NextResponse.json({ error: 'Failed to fetch expenses' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!checkAuth(req).isValid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const { transactionDate, description, amount, type, category, cardId } = await req.json();
    if (!transactionDate || !description || !amount || !type || !category || !cardId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    const expense = await prisma.expense.create({
      data: {
        transactionDate: new Date(transactionDate),
        description,
        amount: parseFloat(amount),
        type,
        category,
        cardId,
      },
      include: {
        card: true,
      },
    });
    return NextResponse.json({ data: expense, success: true, message: 'Expense created' }, { status: 201 });
  } catch (error) {
    console.error('Error creating expense:', error);
    return NextResponse.json({ error: 'Failed to create expense' }, { status: 500 });
  }
} 