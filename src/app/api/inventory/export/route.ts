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

    // Get all inventory items with product details
    const inventoryItems = await prisma.inventoryItem.findMany({
      where: { deletedAt: null },
      include: {
        product: true,
        purchaseOrder: true,
      },
      orderBy: { createdAt: 'desc' },
    }) as any[];

    // Create CSV content
    const csvHeaders = [
      'Product Brand',
      'Product Name',
      'Product SKU',
      'StockLab SKU',
      'Inventory SKU',
      'Size',
      'Condition',
      'Note',
      'Cost',
      'Quantity',
      'Date Delivered',
      'Created Date',
      'Updated Date'
    ];

    const csvRows = inventoryItems.map(item => [
      item.product.brand,
      item.product.name,
      item.product.sku || '',
      item.product.stocklabSku || '',
      item.sku,
      item.size,
      item.condition,
      (item as any).note || '',
      item.cost.toString(),
      item.quantity.toString(),
      item.purchaseOrder?.deliveryDate ? item.purchaseOrder.deliveryDate.toISOString().split('T')[0] : '',
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
        'Content-Disposition': `attachment; filename="inventory-export-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });

    return response;
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      { error: 'Failed to export inventory' },
      { status: 500 }
    );
  }
} 