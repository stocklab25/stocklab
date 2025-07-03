import { NextRequest, NextResponse } from 'next/server';
import { inventory } from '../mockData';
import { InventoryItem } from '../types';

export async function GET() {
  return NextResponse.json(inventory);
}

export async function POST(req: NextRequest) {
  const data = await req.json();
  const newItem: InventoryItem = {
    id: `item${inventory.length + 1}`,
    ...data,
  };
  inventory.push(newItem);
  return NextResponse.json(newItem, { status: 201 });
} 