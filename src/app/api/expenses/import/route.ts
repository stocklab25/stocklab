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

    const { expenses } = await request.json();

    if (!Array.isArray(expenses)) {
      return NextResponse.json(
        { error: 'Expenses must be an array' },
        { status: 400 }
      );
    }

    const results = {
      created: 0,
      skipped: 0,
      errors: [] as string[],
    };

    for (const expenseData of expenses) {
      try {
        // Validate required fields
        if (!expenseData.transactionDate || !expenseData.description || !expenseData.amount || !expenseData.type || !expenseData.category || !expenseData.cardId) {
          results.errors.push(`Expense missing required fields: ${JSON.stringify(expenseData)}`);
          results.skipped++;
          continue;
        }

        // Check if card exists
        const card = await prisma.card.findUnique({
          where: { id: expenseData.cardId },
        });

        if (!card) {
          results.errors.push(`Card not found: ${expenseData.cardId}`);
          results.skipped++;
          continue;
        }

        // Create the expense
        await prisma.expense.create({
          data: {
            transactionDate: new Date(expenseData.transactionDate),
            description: expenseData.description,
            amount: parseFloat(expenseData.amount),
            type: expenseData.type,
            category: expenseData.category,
            cardId: expenseData.cardId,
          },
        });

        results.created++;
      } catch (error) {
        
        results.errors.push(`Failed to create expense: ${JSON.stringify(expenseData)}`);
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
      { error: 'Failed to import expenses' },
      { status: 500 }
    );
  }
} 
