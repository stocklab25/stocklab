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
    const inventoryItems = [];

    // Parse data rows
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      
      // Skip empty rows (where all values are empty)
      if (values.every(v => !v)) {
        continue;
      }
      
      const item: any = {};
      
      headers.forEach((header, index) => {
        item[header] = values[index] || '';
      });
      
      inventoryItems.push(item);
    }

    if (inventoryItems.length === 0) {
      return NextResponse.json(
        { error: 'No inventory items found in CSV file' },
        { status: 400 }
      );
    }

    const results = {
      created: 0,
      skipped: 0,
      errors: [] as string[],
    };

    for (let i = 0; i < inventoryItems.length; i++) {
      const itemData = inventoryItems[i];
      try {
        // Normalize field names (case-insensitive)
        const normalizedData = {
          productSku: itemData.productSku || itemData['Product SKU'] || itemData['ProductSKU'] || itemData.sku || itemData.SKU,
          size: itemData.size || itemData.Size,
          condition: itemData.condition || itemData.Condition,
          quantity: itemData.quantity || itemData.Quantity,
          cost: itemData.cost || itemData.Cost,
          notes: itemData.notes || itemData.Notes,
        };

        // Validate required fields
        if (!normalizedData.productSku || !normalizedData.size || !normalizedData.condition || !normalizedData.quantity) {
          results.errors.push(`Row ${i + 1}: Missing required fields (productSku, size, condition, and quantity are required)`);
          results.skipped++;
          continue;
        }

        // Check if product exists
        const product = await prisma.product.findFirst({
          where: {
            sku: normalizedData.productSku,
            deletedAt: null,
          },
        });

        if (!product) {
          results.errors.push(`Row ${i + 1}: Product with SKU "${normalizedData.productSku}" not found`);
          results.skipped++;
          continue;
        }

        // Validate condition
        const validConditions = ['NEW', 'LIKE_NEW', 'GOOD', 'FAIR', 'POOR'];
        if (!validConditions.includes(normalizedData.condition.toUpperCase())) {
          results.errors.push(`Row ${i + 1}: Invalid condition "${normalizedData.condition}". Must be one of: ${validConditions.join(', ')}`);
          results.skipped++;
          continue;
        }

        // Validate quantity
        const quantity = parseInt(normalizedData.quantity);
        if (isNaN(quantity) || quantity <= 0) {
          results.errors.push(`Row ${i + 1}: Invalid quantity "${normalizedData.quantity}". Must be a positive number`);
          results.skipped++;
          continue;
        }

        // Validate cost if provided
        let cost = null;
        if (normalizedData.cost) {
          cost = parseFloat(normalizedData.cost);
          if (isNaN(cost) || cost < 0) {
            results.errors.push(`Row ${i + 1}: Invalid cost "${normalizedData.cost}". Must be a non-negative number`);
            results.skipped++;
            continue;
          }
        }

        // Check if inventory item already exists
        const existingItem = await prisma.inventoryItem.findFirst({
          where: {
            productId: product.id,
            size: normalizedData.size,
            condition: normalizedData.condition.toUpperCase(),
            deletedAt: null,
          },
        });

        if (existingItem) {
          // Update existing item quantity
          await prisma.inventoryItem.update({
            where: { id: existingItem.id },
            data: {
              quantity: existingItem.quantity + quantity,
              cost: cost || existingItem.cost,
              notes: normalizedData.notes || existingItem.notes,
            },
          });
        } else {
          // Create new inventory item
          await prisma.inventoryItem.create({
            data: {
              productId: product.id,
              size: normalizedData.size,
              condition: normalizedData.condition.toUpperCase(),
              quantity: quantity,
              cost: cost,
              notes: normalizedData.notes || undefined,
            },
          });
        }

        results.created++;
      } catch (error: any) {
        results.errors.push(`Row ${i + 1}: ${error.message || 'Unknown error'}`);
        results.skipped++;
      }
    }

    return NextResponse.json({
      message: 'Inventory import completed',
      results,
    });
  } catch (error: any) {
    console.error('Inventory import error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
