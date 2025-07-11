import { NextRequest, NextResponse } from 'next/server';
import { verifySupabaseAuth } from '@/lib/supabase-auth';
import prisma from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { user, isValid } = await verifySupabaseAuth(req);
    if (!isValid || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - Authentication required' },
        { status: 401 }
      );
    }

    const cards = await prisma.card.findMany({
      where: { deletedAt: null },
      orderBy: { name: 'asc' },
    });
    return NextResponse.json({ data: cards, success: true });
  } catch (error) {
    
    return NextResponse.json({ error: 'Failed to fetch cards' }, { status: 500 });
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

    const { name, last4, bank, type } = await req.json();
    if (!name) {
      return NextResponse.json({ error: 'Card name is required' }, { status: 400 });
    }
    const card = await prisma.card.create({
      data: {
        name,
        last4,
        bank,
        type,
      },
    });
    return NextResponse.json({ data: card, success: true, message: 'Card created' }, { status: 201 });
  } catch (error) {
    
    return NextResponse.json({ error: 'Failed to create card' }, { status: 500 });
  }
} 
