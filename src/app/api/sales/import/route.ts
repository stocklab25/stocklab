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

    const { sales } = await request.json();

    if (!Array.isArray(sales)) {
      return NextResponse.json(
        { error: 'Sales must be an array' },
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
        // Validate required fields
        if (!saleData.storeId || !saleData.inventoryItemId || !saleData.cost || !saleData.payout) {
          results.errors.push(`Sale missing required fields: ${JSON.stringify(saleData)}`);
          results.skipped++;
          continue;
        }

        // Check if store exists
        const store = await prisma.store.findUnique({
          where: { id: saleData.storeId },
        });

        if (!store) {
          results.errors.push(`Store not found: ${saleData.storeId}`);
          results.skipped++;
          continue;
        }

        // Check if inventory item exists
        const inventoryItem = await prisma.inventoryItem.findUnique({
          where: { id: saleData.inventoryItemId },
        });

        if (!inventoryItem) {
          results.errors.push(`Inventory item not found: ${saleData.inventoryItemId}`);
          results.skipped++;
          continue;
        }

        // Generate unique order number if not provided
        let orderNumber = saleData.orderNumber;
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
            storeId: saleData.storeId,
            inventoryItemId: saleData.inventoryItemId,
            orderNumber,
            quantity: saleData.quantity || 1,
            cost: parseFloat(saleData.cost),
            payout: parseFloat(saleData.payout),
            discount: saleData.discount ? parseFloat(saleData.discount) : null,
            saleDate: saleData.saleDate ? new Date(saleData.saleDate) : new Date(),
            notes: saleData.notes,
          },
        });

        results.created++;
      } catch (error) {
        
        results.errors.push(`Failed to create sale: ${JSON.stringify(saleData)}`);
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
      { error: 'Failed to import sales' },
      { status: 500 }
    );
  }
} 
