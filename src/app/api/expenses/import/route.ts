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

    // Parse FormData to get the file
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Read and parse CSV file
    const fileBuffer = await file.arrayBuffer();
    const fileString = new TextDecoder().decode(fileBuffer);
    
    // Simple CSV parsing (split by lines and commas)
    const lines = fileString.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      return NextResponse.json(
        { error: 'CSV file must have at least a header row and one data row' },
        { status: 400 }
      );
    }

    // Parse header row
    const headers = lines[0].split(',').map(h => h.trim());
    const expenses = [];

    // Parse data rows
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const expense: any = {};
      
      headers.forEach((header, index) => {
        expense[header] = values[index] || '';
      });
      
      expenses.push(expense);
    }

    if (expenses.length === 0) {
      return NextResponse.json(
        { error: 'No expenses found in CSV file' },
        { status: 400 }
      );
    }

    const results = {
      created: 0,
      skipped: 0,
      errors: [] as string[],
    };

    for (let i = 0; i < expenses.length; i++) {
      const expenseData = expenses[i];
      try {
        // Normalize field names (case-insensitive)
        const normalizedData = {
          transactionDate: expenseData.transactionDate || expenseData['Transaction Date'] || expenseData['TransactionDate'] || expenseData.Date,
          description: expenseData.description || expenseData.Description,
          amount: expenseData.amount || expenseData.Amount,
          category: expenseData.category || expenseData.Category,
          cardName: expenseData.cardName || expenseData['Card Name'] || expenseData['CardName'],
          // Direct ID (if provided)
          cardId: expenseData.cardId || expenseData['Card ID'] || expenseData['CardId'],
        };

        // Validate required fields - but don't skip, just log warnings
        const missingFields = [];
        if (!normalizedData.transactionDate) missingFields.push('transactionDate');
        if (!normalizedData.description) missingFields.push('description');
        if (!normalizedData.amount) missingFields.push('amount');
        if (!normalizedData.category) missingFields.push('category');
        
        if (missingFields.length > 0) {
          results.errors.push(`Row ${i + 1}: Missing fields: ${missingFields.join(', ')} - proceeding anyway`);
        }

        // Find card by name if not provided by ID
        let card = null;
        if (normalizedData.cardId) {
          card = await prisma.card.findUnique({
            where: { id: normalizedData.cardId },
          });
        } else if (normalizedData.cardName) {
          card = await prisma.card.findFirst({
            where: {
              name: normalizedData.cardName,
              deletedAt: null,
            },
          });
        }

        if (!card) {
          results.errors.push(`Row ${i + 1}: Card not found - proceeding without card`);
        }





        // Create the expense
        await prisma.expense.create({
          data: {
            transactionDate: normalizedData.transactionDate ? new Date(normalizedData.transactionDate) : new Date(),
            description: normalizedData.description || 'No description provided',
            amount: normalizedData.amount ? parseFloat(normalizedData.amount) : 0,
            category: normalizedData.category || 'Uncategorized',
            cardId: card?.id || undefined,
          },
        });

        results.created++;
      } catch (error) {
        console.error('Error creating expense:', error);
        results.errors.push(`Row ${i + 1}: Failed to create expense`);
        results.skipped++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Import completed. Created: ${results.created}, Skipped: ${results.skipped}`,
      results,
    });
  } catch (error) {
    console.error('Expenses import error:', error);
    return NextResponse.json(
      { error: 'Failed to import expenses', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 
