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
    const requiredColumns = ['Date', 'Store', 'Product SKU', 'Size', 'Condition', 'Quantity', 'Cost', 'Sale Price'];
    
    for (const column of requiredColumns) {
      if (!header.includes(column)) {
        return NextResponse.json(
          { error: `Missing required column: ${column}` },
          { status: 400 }
        );
      }
    }

    const results = {
      salesCreated: 0,
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
        if (!rowData.Date || !rowData.Store || !rowData['Product SKU'] || !rowData.Size || !rowData.Condition || !rowData.Quantity || !rowData.Cost || !rowData['Sale Price']) {
          results.errors.push(`Row ${i + 1}: Missing required fields`);
          continue;
        }

        // Parse and validate data
        const saleDate = new Date(rowData.Date);
        if (isNaN(saleDate.getTime())) {
          results.errors.push(`Row ${i + 1}: Invalid date format`);
          continue;
        }

        const quantity = parseInt(rowData.Quantity);
        if (isNaN(quantity) || quantity <= 0) {
          results.errors.push(`Row ${i + 1}: Invalid quantity`);
          continue;
        }

        const cost = parseFloat(rowData.Cost);
        if (isNaN(cost) || cost < 0) {
          results.errors.push(`Row ${i + 1}: Invalid cost`);
          continue;
        }

        const salePrice = parseFloat(rowData['Sale Price']);
        if (isNaN(salePrice) || salePrice < 0) {
          results.errors.push(`Row ${i + 1}: Invalid sale price`);
          continue;
        }

        // Find store
        const store = await prisma.store.findFirst({
          where: {
            name: { contains: rowData.Store, mode: 'insensitive' },
            deletedAt: null,
            status: 'ACTIVE'
          }
        });

        if (!store) {
          results.errors.push(`Row ${i + 1}: Store not found: ${rowData.Store}`);
          continue;
        }

        // Find product by SKU
        const product = await prisma.product.findFirst({
          where: {
            sku: { equals: rowData['Product SKU'], mode: 'insensitive' },
            deletedAt: null
          }
        });

        if (!product) {
          results.errors.push(`Row ${i + 1}: Product not found: ${rowData['Product SKU']}`);
          continue;
        }

        // Find inventory item by product, size, and condition
        const inventoryItem = await prisma.inventoryItem.findFirst({
          where: {
            productId: product.id,
            size: { equals: rowData.Size, mode: 'insensitive' },
            condition: rowData.Condition.toUpperCase() as any,
            deletedAt: null
          }
        });

        if (!inventoryItem) {
          results.errors.push(`Row ${i + 1}: Inventory item not found for product ${rowData['Product SKU']} with size ${rowData.Size} and condition ${rowData.Condition}`);
          continue;
        }

        // Check store inventory availability
        const storeInventory = await prisma.storeInventory.findUnique({
          where: {
            storeId_inventoryItemId: {
              storeId: store.id,
              inventoryItemId: inventoryItem.id
            }
          }
        });

        if (!storeInventory) {
          results.errors.push(`Row ${i + 1}: Item not available at store: ${rowData['Product SKU']} (${rowData.Size}/${rowData.Condition}) at ${rowData.Store}`);
          continue;
        }

        if (storeInventory.quantity < quantity) {
          results.errors.push(`Row ${i + 1}: Insufficient store inventory. Available: ${storeInventory.quantity}, Requested: ${quantity}`);
          continue;
        }

        // Create sale and update inventory in a transaction
        await prisma.$transaction(async (tx) => {
          // Generate order number
          const orderNumber = `SALE-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          
          // Create the sale
          const sale = await tx.sale.create({
            data: {
              orderNumber: orderNumber,
              saleDate: saleDate,
              quantity: quantity,
              cost: cost,
              payout: salePrice,
              notes: rowData.Notes || undefined,
              storeId: store.id,
              inventoryItemId: inventoryItem.id
            }
          });

          // Update store inventory quantity
          await tx.storeInventory.update({
            where: {
              storeId_inventoryItemId: {
                storeId: store.id,
                inventoryItemId: inventoryItem.id
              }
            },
            data: {
              quantity: {
                decrement: quantity
              }
            }
          });

          return sale;
        });

        results.salesCreated++;

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
      { error: 'Failed to import sales', details: error.message },
      { status: 500 }
    );
  }
} 