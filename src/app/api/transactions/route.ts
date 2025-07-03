import { NextRequest, NextResponse } from 'next/server';
import { stockTransactions } from '../mockData';
import { StockTransaction } from '../types';

export async function GET() {
  return NextResponse.json(stockTransactions);
}

export async function POST(req: NextRequest) {
  const data = await req.json();
  const newTxn: StockTransaction = {
    id: `txn${stockTransactions.length + 1}`,
    ...data,
  };
  stockTransactions.push(newTxn);
  return NextResponse.json(newTxn, { status: 201 });
} 