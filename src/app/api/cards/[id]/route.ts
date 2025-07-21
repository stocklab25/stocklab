import { NextRequest, NextResponse } from 'next/server';
import { verifySupabaseAuth } from '@/lib/supabase-auth';
import prisma from '@/lib/db';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, isValid } = await verifySupabaseAuth(request);
    if (!isValid || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - Authentication required' },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Check if card exists
    const card = await prisma.card.findUnique({
      where: { id },
      include: {
        expenses: true
      }
    });

    if (!card) {
      return NextResponse.json(
        { error: 'Card not found' },
        { status: 404 }
      );
    }

    // Check if card has associated expenses
    if (card.expenses.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete card with associated expenses. Please delete or reassign expenses first.' },
        { status: 400 }
      );
    }

    // Soft delete the card
    await prisma.card.update({
      where: { id },
      data: { deletedAt: new Date() }
    });

    return NextResponse.json({
      success: true,
      message: 'Card deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting card:', error);
    return NextResponse.json(
      { error: 'Failed to delete card' },
      { status: 500 }
    );
  }
} 