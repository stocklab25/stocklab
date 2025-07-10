import { NextRequest, NextResponse } from 'next/server';
import { ProductService, InventoryService } from '@/prisma/services';
import { verifyToken } from '@/lib/auth';
import prisma from '@/lib/db';

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
  try {
    // Check authentication
    const { user, isValid } = checkAuth(request);
    if (!isValid || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - Authentication required' },
        { status: 401 }
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

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!file.name.endsWith('.csv')) {
      return NextResponse.json({ error: 'File must be a CSV' }, { status: 400 });
    }

    const text = await file.text();
    const lines = text.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      return NextResponse.json({ error: 'CSV must have at least a header and one data row' }, { status: 400 });
    }

    const headers = lines[0].split(',').map(h => h.trim());
    const dataRows = lines.slice(1);

    const results = {
      productsCreated: 0,
      productsUpdated: 0,
      inventoryItemsCreated: 0,
      errors: [] as string[]
    };

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const values = row.split(',').map(v => v.trim());
      
      if (values.length !== headers.length) {
        results.errors.push(`Row ${i + 2}: Invalid number of columns`);
        continue;
      }

      const rowData: any = {};
      headers.forEach((header, index) => {
        rowData[header] = values[index];
      });

      try {
        // Validate required fields
        if (!rowData.Brand || !rowData.Name || !rowData.Size || !rowData.Condition) {
          results.errors.push(`Row ${i + 2}: Missing required fields (Brand, Name, Size, Condition)`);
          continue;
        }

        // Validate condition
        const validConditions = ['NEW', 'PRE_OWNED'];
        if (!validConditions.includes(rowData.Condition.toUpperCase())) {
          results.errors.push(`Row ${i + 2}: Invalid condition. Must be one of: ${validConditions.join(', ')}`);
          continue;
        }

        // Validate item type
        const validItemTypes = ['SHOE', 'APPAREL', 'MERCH'];
        if (!validItemTypes.includes(rowData.ItemType?.toUpperCase())) {
          results.errors.push(`Row ${i + 2}: Invalid item type. Must be one of: ${validItemTypes.join(', ')}`);
          continue;
        }

        // Check if product exists by brand and name
        const productsByBrand = await ProductService.getProductsByBrand(rowData.Brand);
        let product = productsByBrand.find((p: any) => p.name.toLowerCase() === rowData.Name.toLowerCase());
        
        if (!product) {
          // Create new product
          product = await ProductService.createProduct({
            brand: rowData.Brand,
            name: rowData.Name,
            color: rowData.Color || undefined,
            sku: rowData.SKU || undefined,
            cost: rowData.Cost ? parseFloat(rowData.Cost) : undefined,
            payout: rowData.Payout ? parseFloat(rowData.Payout) : undefined,
          });
          results.productsCreated++;
        } else {
          results.productsUpdated++;
        }

        // Create inventory item
        await InventoryService.createInventoryItemWithInitialStock({
          productId: product.id,
          sku: rowData.SKU || `${product.brand}-${product.name}-${rowData.Size}`,
          size: rowData.Size,
          condition: rowData.Condition.toUpperCase() as any,
          cost: rowData.Cost ? parseFloat(rowData.Cost) : 0,
          status: 'InStock',
          quantity: rowData.Quantity ? parseInt(rowData.Quantity) : 1,
          vendor: rowData.Vendor || 'Unknown',
          paymentMethod: rowData.PaymentMethod || 'Cash',
          userId: dbUser.id,
        });

        results.inventoryItemsCreated++;

      } catch (error: any) {
        results.errors.push(`Row ${i + 2}: ${error.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      results
    });

  } catch (error: any) {
    console.error('Import error:', error);
    return NextResponse.json(
      { error: 'Failed to import products', details: error.message },
      { status: 500 }
    );
  }
} 