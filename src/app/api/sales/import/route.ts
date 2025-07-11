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
    const sales = [];

    // Parse data rows
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      
      // Skip empty rows (where all values are empty)
      if (values.every(v => !v)) {
        continue;
      }
      
      const sale: any = {};
      
      headers.forEach((header, index) => {
        sale[header] = values[index] || '';
      });
      
      sales.push(sale);
    }

    if (sales.length === 0) {
      return NextResponse.json(
        { error: 'No sales found in CSV file' },
        { status: 400 }
      );
    }

    const results = {
      created: 0,
      skipped: 0,
      errors: [] as string[],
    };

    for (const saleData of sales) {
      try {
        // Normalize field names (case-insensitive)
        const normalizedData = {
          storeId: saleData.storeId || saleData['Store ID'] || saleData['StoreId'],
          inventoryItemId: saleData.inventoryItemId || saleData['Inventory Item ID'] || saleData['InventoryItemId'],
          cost: saleData.cost || saleData.Cost,
          payout: saleData.payout || saleData.Payout,
          orderNumber: saleData.orderNumber || saleData['Order Number'] || saleData['OrderNumber'],
          quantity: saleData.quantity || saleData.Quantity,
          discount: saleData.discount || saleData.Discount,
          saleDate: saleData.saleDate || saleData['Sale Date'] || saleData['SaleDate'],
          notes: saleData.notes || saleData.Notes,
        };

        // Validate required fields
        if (!normalizedData.storeId || !normalizedData.inventoryItemId || !normalizedData.cost || !normalizedData.payout) {
          results.errors.push(`Sale missing required fields: ${JSON.stringify(saleData)}`);
          results.skipped++;
          continue;
        }

        // Check if store exists
        const store = await prisma.store.findUnique({
          where: { id: normalizedData.storeId },
        });

        if (!store) {
          results.errors.push(`Store not found: ${normalizedData.storeId}`);
          results.skipped++;
          continue;
        }

        // Check if inventory item exists
        const inventoryItem = await prisma.inventoryItem.findUnique({
          where: { id: normalizedData.inventoryItemId },
        });

        if (!inventoryItem) {
          results.errors.push(`Inventory item not found: ${normalizedData.inventoryItemId}`);
          results.skipped++;
          continue;
        }

        // Generate unique order number if not provided
        let orderNumber = normalizedData.orderNumber;
        if (!orderNumber) {
          const timestamp = Date.now().toString();
          const random = Math.random().toString(36).substring(2, 8).toUpperCase();
          orderNumber = `SALE-${timestamp}-${random}`;
        }

        // Check if order number already exists
        const existingSale = await prisma.sale.findUnique({
          where: { orderNumber },
        });

        if (existingSale) {
          results.errors.push(`Order number already exists: ${orderNumber}`);
          results.skipped++;
          continue;
        }

        // Create the sale
        await prisma.sale.create({
          data: {
            storeId: normalizedData.storeId,
            inventoryItemId: normalizedData.inventoryItemId,
            orderNumber,
            quantity: parseInt(normalizedData.quantity) || 1,
            cost: parseFloat(normalizedData.cost),
            payout: parseFloat(normalizedData.payout),
            discount: normalizedData.discount ? parseFloat(normalizedData.discount) : null,
            saleDate: normalizedData.saleDate ? new Date(normalizedData.saleDate) : new Date(),
            notes: normalizedData.notes,
          },
        });

        results.created++;
      } catch (error) {
        console.error('Error creating sale:', error);
        results.errors.push(`Failed to create sale: ${JSON.stringify(saleData)} - ${error instanceof Error ? error.message : 'Unknown error'}`);
        results.skipped++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Import completed. Created: ${results.created}, Skipped: ${results.skipped}`,
      results,
    });
  } catch (error) {
    console.error('Sales import error:', error);
    return NextResponse.json(
      { error: 'Failed to import sales', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 
