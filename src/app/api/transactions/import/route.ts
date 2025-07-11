import { NextRequest, NextResponse } from 'next/server';
import { verifySupabaseAuth } from '@/lib/supabase-auth';
import prisma from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { user, isValid } = await verifySupabaseAuth(request);
    if (!isValid || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - Authentication required' },
        { status: 401 }
      );
    }

    const { transactions } = await request.json();

    if (!Array.isArray(transactions)) {
      return NextResponse.json(
        { error: 'Transactions must be an array' },
        { status: 400 }
      );
    }

    // Verify user exists in database
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id }
    });

    if (!dbUser) {
      return NextResponse.json(
        { error: 'User not found in database' },
        { status: 404 }
      );
    }

    const results = {
      created: 0,
      skipped: 0,
      errors: [] as string[],
    };

    for (const transactionData of transactions) {
      try {
        // Validate required fields
        if (!transactionData.inventoryItemId || !transactionData.type || !transactionData.quantity) {
          results.errors.push(`Transaction missing required fields: ${JSON.stringify(transactionData)}`);
          results.skipped++;
          continue;
        }

        // Check if inventory item exists
        const inventoryItem = await prisma.inventoryItem.findUnique({
          where: { id: transactionData.inventoryItemId },
        });

        if (!inventoryItem) {
          results.errors.push(`Inventory item not found: ${transactionData.inventoryItemId}`);
          results.skipped++;
          continue;
        }

        // Create the transaction
        await prisma.stockTransaction.create({
          data: {
            inventoryItemId: transactionData.inventoryItemId,
            type: transactionData.type,
            quantity: parseInt(transactionData.quantity),
            date: transactionData.date ? new Date(transactionData.date) : new Date(),
            notes: transactionData.notes,
            userId: dbUser.id,
          },
        });

        results.created++;
      } catch (error) {
        
        results.errors.push(`Failed to create transaction: ${JSON.stringify(transactionData)}`);
        results.skipped++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Import completed. Created: ${results.created}, Skipped: ${results.skipped}`,
      results,
    });
  } catch (error) {
    
    return NextResponse.json(
      { error: 'Failed to import transactions' },
      { status: 500 }
    );
  }
} 
