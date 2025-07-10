import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { verifyToken } from '@/lib/auth';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

// Auth check function
function checkAuth(req: NextRequest): { user: User | null; isValid: boolean } {
  // Check for auth token in headers
  const authHeader = req.headers.get('authorization');
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    const user = verifyToken(token);
    return { user, isValid: !!user };
  }
  
  // Check for auth token in cookies
  const authCookie = req.cookies.get('authToken')?.value;
  if (authCookie) {
    const user = verifyToken(authCookie);
    return { user, isValid: !!user };
  }
  
  return { user: null, isValid: false };
}

export async function POST(request: NextRequest) {
  // Check authentication
  const { user, isValid } = checkAuth(request);
  if (!isValid || !user) {
    return NextResponse.json(
      { error: 'Unauthorized - Authentication required' },
      { status: 401 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.name.endsWith('.csv')) {
      return NextResponse.json(
        { error: 'File must be a CSV' },
        { status: 400 }
      );
    }

    // Read file content
    const text = await file.text();
    const lines = text.split('\n').filter(line => line.trim());

    if (lines.length < 2) {
      return NextResponse.json(
        { error: 'CSV file must have at least a header row and one data row' },
        { status: 400 }
      );
    }

    // Parse header
    const header = lines[0].split(',').map(h => h.trim());
    const requiredColumns = ['Date', 'Description', 'Amount', 'Type', 'Category', 'Card Name'];
    
    for (const column of requiredColumns) {
      if (!header.includes(column)) {
        return NextResponse.json(
          { error: `Missing required column: ${column}` },
          { status: 400 }
        );
      }
    }

    const results = {
      expensesCreated: 0,
      errors: [] as string[]
    };

    // Process each data row
    for (let i = 1; i < lines.length; i++) {
      try {
        const line = lines[i];
        if (!line.trim()) continue;

        const values = line.split(',').map(v => v.trim());
        const rowData: any = {};
        
        header.forEach((col, index) => {
          rowData[col] = values[index] || '';
        });

        // Validate required fields
        if (!rowData.Date || !rowData.Description || !rowData.Amount || !rowData.Type || !rowData.Category || !rowData['Card Name']) {
          results.errors.push(`Row ${i + 1}: Missing required fields`);
          continue;
        }

        // Parse and validate data
        const transactionDate = new Date(rowData.Date);
        if (isNaN(transactionDate.getTime())) {
          results.errors.push(`Row ${i + 1}: Invalid date format`);
          continue;
        }

        const amount = parseFloat(rowData.Amount);
        if (isNaN(amount) || amount <= 0) {
          results.errors.push(`Row ${i + 1}: Invalid amount`);
          continue;
        }

        // Validate type
        const validTypes = ['Credit', 'Debit', 'Cash'];
        if (!validTypes.includes(rowData.Type)) {
          results.errors.push(`Row ${i + 1}: Invalid type. Must be one of: ${validTypes.join(', ')}`);
          continue;
        }

        // Validate category
        const validCategories = ['Parking', 'Travel', 'Inventory', 'Supplies', 'BusinessServices', 'Payment'];
        if (!validCategories.includes(rowData.Category)) {
          results.errors.push(`Row ${i + 1}: Invalid category. Must be one of: ${validCategories.join(', ')}`);
          continue;
        }

        // Find card by name
        const card = await prisma.card.findFirst({
          where: {
            name: { contains: rowData['Card Name'], mode: 'insensitive' },
            deletedAt: null
          }
        });

        if (!card) {
          results.errors.push(`Row ${i + 1}: Card not found: ${rowData['Card Name']}`);
          continue;
        }

        // Create expense
        await prisma.expense.create({
          data: {
            transactionDate: transactionDate,
            description: rowData.Description,
            amount: amount,
            type: rowData.Type,
            category: rowData.Category as any,
            cardId: card.id,
          }
        });

        results.expensesCreated++;

      } catch (error: any) {
        results.errors.push(`Row ${i + 1}: ${error.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      results
    });

  } catch (error: any) {
    console.error('Import error:', error);
    return NextResponse.json(
      { error: 'Failed to import expenses', details: error.message },
      { status: 500 }
    );
  }
} 