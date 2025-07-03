import { NextRequest, NextResponse } from 'next/server';
import { products } from '../mockData';
import { Product } from '../types';

export async function GET() {
  return NextResponse.json(products);
}

export async function POST(req: NextRequest) {
  const data = await req.json();
  // In a real app, validate and save to DB
  const newProduct: Product = {
    id: `prod${products.length + 1}`,
    ...data,
  };
  products.push(newProduct);
  return NextResponse.json(newProduct, { status: 201 });
} 