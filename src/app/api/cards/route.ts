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
    const cards = await prisma.card.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ data: cards, success: true });
  } catch (error) {
    console.error('Error fetching cards:', error);
    return NextResponse.json({ error: 'Failed to fetch cards' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!checkAuth(req).isValid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const { name, last4, bank, type } = await req.json();
    if (!name) {
      return NextResponse.json({ error: 'Card name is required' }, { status: 400 });
    }
    const card = await prisma.card.create({
      data: {
        name,
        last4: last4 || null,
        bank: bank || null,
        type: type || null,
      },
    });
    return NextResponse.json({ data: card, success: true, message: 'Card created' }, { status: 201 });
  } catch (error) {
    console.error('Error creating card:', error);
    return NextResponse.json({ error: 'Failed to create card' }, { status: 500 });
  }
} 