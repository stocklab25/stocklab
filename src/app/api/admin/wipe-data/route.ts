import { NextRequest, NextResponse } from 'next/server';
import { verifySupabaseAuth } from '@/lib/supabase-auth';
import prisma from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { user, isValid } = await verifySupabaseAuth(req);
    if (!isValid || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - Authentication required' },
        { status: 401 }
      );
    }

    // Verify user exists in database and has admin role
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id }
    });

    if (!dbUser) {
      return NextResponse.json(
        { error: 'User not found in database' },
        { status: 404 }
      );
    }

    if (dbUser.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    const { confirm } = await req.json();

    if (confirm !== 'I understand this will delete all data permanently') {
      return NextResponse.json(
        { error: 'Confirmation message does not match. Please type the exact confirmation message.' },
        { status: 400 }
      );
    }

    // Wipe all data in a transaction
    await prisma.$transaction(async (tx) => {
      // Delete all data in reverse order of dependencies
      await tx.expense.deleteMany({});
      await tx.sale.deleteMany({});
      await tx.stockTransaction.deleteMany({});
      await tx.purchase.deleteMany({});
      await tx.storeInventory.deleteMany({});
      await tx.inventoryItem.deleteMany({});
      await tx.product.deleteMany({});
      await tx.store.deleteMany({});
      await tx.card.deleteMany({});
      // Note: We don't delete users to preserve admin access
    });

    return NextResponse.json({
      success: true,
      message: 'All data has been permanently deleted'
    });
  } catch (error) {
    
    return NextResponse.json(
      { error: 'Failed to wipe data' },
      { status: 500 }
    );
  }
} 
