import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { verifySupabaseAuth } from '@/lib/supabase-auth';

export async function GET(request: NextRequest) {
  try {
    const { user, isValid } = await verifySupabaseAuth(request);
    if (!isValid || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const accounting = await prisma.accounting.findMany({
      where: { deletedAt: null },
      orderBy: { transactionDate: 'desc' }
    });

    return NextResponse.json({ data: accounting });
  } catch (error) {
    console.error('Error fetching accounting entries:', error);
    return NextResponse.json(
      { error: 'Failed to fetch accounting entries' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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

    const accounting = await prisma.accounting.create({
      data: {
        transactionDate: new Date(transactionDate),
        name,
        description,
        accountType,
        amount: parseFloat(amount),
        status: status || 'PENDING'
      }
    });

    return NextResponse.json(accounting);
  } catch (error) {
    console.error('Error creating accounting entry:', error);
    return NextResponse.json(
      { error: 'Failed to create accounting entry' },
      { status: 500 }
    );
  }
} 