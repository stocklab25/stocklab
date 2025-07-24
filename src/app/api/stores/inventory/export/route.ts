import { NextRequest, NextResponse } from 'next/server';
import { verifySupabaseAuth } from '@/lib/supabase-auth';
import prisma from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { user, isValid } = await verifySupabaseAuth(request);
    if (!isValid || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('storeId');

    // Build where clause
    const whereClause: any = {
      deletedAt: null,
      quantity: {
        gt: 0
      }
    };

    // If specific store is selected, filter by storeId
    if (storeId && storeId !== 'ALL') {
      whereClause.storeId = storeId;
    }

    // Get all store inventory items
    const storeInventory = await prisma.storeInventory.findMany({
      where: whereClause,
      include: {
        inventoryItem: {
          include: {
            product: true,
            purchaseOrder: true,
          }
        },
        store: true,
      },
      orderBy: [
        {
          store: {
            name: 'asc'
          }
        },
        {
          inventoryItem: {
            product: {
              brand: 'asc'
            }
          }
        }
      ]
    }) as any[];

    // Create CSV content
    const csvHeaders = [
      'Store Name',
      'Product Brand',
      'Product Name',
      'Product SKU',
      'SL SKU',
      'Store SKU',
      'Inventory SKU',
      'Size',
      'Condition',
      'Warehouse Cost',
      'Transfer Cost',
      'Store Quantity',
      'Date Delivered',
      'Created Date',
      'Updated Date'
    ];

    const csvRows = storeInventory.map(item => [
      item.store?.name || 'Unknown Store',
      item.inventoryItem.product.brand,
      item.inventoryItem.product.name,
      item.inventoryItem.product.sku || '',
      item.inventoryItem.product.stocklabSku || '',
      item.storeSku || '',
      item.inventoryItem.sku,
      item.inventoryItem.size,
      item.inventoryItem.condition,
      item.inventoryItem.cost.toString(),
      item.transferCost.toString(),
      item.quantity.toString(),
      item.inventoryItem.purchaseOrder?.deliveryDate ? item.inventoryItem.purchaseOrder.deliveryDate.toISOString().split('T')[0] : '',
      item.createdAt.toISOString().split('T')[0],
      item.updatedAt.toISOString().split('T')[0]
    ]);

    // Combine headers and rows
    const csvContent = [csvHeaders, ...csvRows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    // Create response with CSV content
    const response = new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="store-inventory-export-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });

    return response;
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      { error: 'Failed to export store inventory' },
      { status: 500 }
    );
  }
} 