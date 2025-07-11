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
function checkAuth(req: NextRequest): boolean {
  // Check for auth token in headers
  const authHeader = req.headers.get('authorization');
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    const user = verifyToken(token);
    return !!user;
  }
  
  // Check for auth token in cookies
  const authCookie = req.cookies.get('authToken')?.value;
  if (authCookie) {
    const user = verifyToken(authCookie);
    return !!user;
  }
  
  return false;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  try {
    // Check authentication
    if (!checkAuth(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { type } = await params;
    let csvData = '';

    switch (type) {
      case 'inventory':
        csvData = await generateInventoryReport();
        break;
      case 'store-inventory':
        csvData = await generateStoreInventoryReport();
        break;
      case 'sales':
        csvData = await generateSalesReport();
        break;
      case 'purchase-orders':
        csvData = await generatePurchaseOrdersReport();
        break;
      case 'expenses':
        csvData = await generateExpensesReport();
        break;
      default:
        return NextResponse.json({ error: 'Invalid report type' }, { status: 400 });
    }

    // Set headers for CSV download
    const headers = new Headers();
    headers.set('Content-Type', 'text/csv');
    headers.set('Content-Disposition', `attachment; filename="${type}-report-${new Date().toISOString().split('T')[0]}.csv"`);

    return new NextResponse(csvData, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}

async function generateInventoryReport(): Promise<string> {
  const inventory = await prisma.inventoryItem.findMany({
    include: {
      product: true,
    },
    where: {
      deletedAt: null,
    },
  });

  const headers = [
    'Product ID',
    'Product Name',
    'Brand',
    'SKU',
    'Item Type',
    'Size',
    'Condition',
    'Cost',
    'Quantity',
    'Total Value',
    'Created At',
    'Updated At'
  ];

  const rows = inventory.map((item: any) => [
    item.productId,
    item.product?.name || '',
    item.product?.brand || '',
    item.sku,
    item.product?.itemType || '',
    item.size,
    item.condition,
    item.cost?.toString() || '0',
    item.quantity?.toString() || '0',
    ((Number(item.cost) || 0) * (item.quantity || 0)).toString(),
    item.createdAt?.toISOString() || '',
    item.updatedAt?.toISOString() || ''
  ]);

  return generateCSV(headers, rows);
}

async function generateStoreInventoryReport(): Promise<string> {
  const storeInventory = await prisma.storeInventory.findMany({
    include: {
      store: true,
      inventoryItem: {
        include: {
          product: true,
        },
      },
    },
    where: {
      deletedAt: null,
    },
  });

  const headers = [
    'Store ID',
    'Store Name',
    'Product ID',
    'Product Name',
    'Brand',
    'SKU',
    'Item Type',
    'Size',
    'Condition',
    'Quantity',
    'Created At',
    'Updated At'
  ];

  const rows = storeInventory.map(item => [
    item.storeId,
    item.store?.name || '',
    item.inventoryItem?.productId || '',
    item.inventoryItem?.product?.name || '',
    item.inventoryItem?.product?.brand || '',
    item.inventoryItem?.sku || '',
    item.inventoryItem?.product?.itemType || '',
    item.inventoryItem?.size || '',
    item.inventoryItem?.condition || '',
    item.quantity?.toString() || '0',
    item.createdAt?.toISOString() || '',
    item.updatedAt?.toISOString() || ''
  ]);

  return generateCSV(headers, rows);
}

async function generateSalesReport(): Promise<string> {
  const sales = await prisma.sale.findMany({
    include: {
      store: true,
      inventoryItem: {
        include: {
          product: true,
        },
      },
    },
    where: {
      deletedAt: null,
    },
  });

  const headers = [
    'Sale ID',
    'Store ID',
    'Store Name',
    'Product ID',
    'Product Name',
    'Brand',
    'SKU',
    'Item Type',
    'Size',
    'Condition',
    'Quantity Sold',
    'Cost',
    'Sale Price',
    'Profit',
    'Sale Date',
    'Created At'
  ];

  const rows = sales.map((sale: any) => {
    const profit = (Number(sale.payout) || 0) - (Number(sale.cost) || 0);
    return [
      sale.id,
      sale.storeId,
      sale.store?.name || '',
      sale.inventoryItem?.productId || '',
      sale.inventoryItem?.product?.name || '',
      sale.inventoryItem?.product?.brand || '',
      sale.inventoryItem?.sku || '',
      sale.inventoryItem?.product?.itemType || '',
      sale.inventoryItem?.size || '',
      sale.inventoryItem?.condition || '',
      sale.quantity?.toString() || '0',
      sale.cost?.toString() || '0',
      sale.payout?.toString() || '0',
      profit.toString(),
      sale.saleDate?.toISOString() || '',
      sale.createdAt?.toISOString() || ''
    ];
  });

  return generateCSV(headers, rows);
}

async function generatePurchaseOrdersReport(): Promise<string> {
  const purchases = await prisma.purchase.findMany({
    include: {
      inventoryItem: {
        include: {
          product: true,
        },
      },
    },
    where: {
      deletedAt: null,
    },
  });

  const headers = [
    'Purchase ID',
    'Product ID',
    'Product Name',
    'Brand',
    'SKU',
    'Item Type',
    'Vendor',
    'Quantity',
    'Cost Per Unit',
    'Total Cost',
    'Purchase Date',
    'Created At'
  ];

  const rows = purchases.map((purchase: any) => [
    purchase.id,
    purchase.inventoryItem?.productId || '',
    purchase.inventoryItem?.product?.name || '',
    purchase.inventoryItem?.product?.brand || '',
    purchase.inventoryItem?.sku || '',
    purchase.inventoryItem?.product?.itemType || '',
    purchase.vendor || '',
    purchase.quantity?.toString() || '0',
    purchase.cost?.toString() || '0',
    ((Number(purchase.cost) || 0) * (purchase.quantity || 0)).toString(),
    purchase.purchaseDate?.toISOString() || '',
    purchase.createdAt?.toISOString() || ''
  ]);

  return generateCSV(headers, rows);
}

async function generateExpensesReport(): Promise<string> {
  const expenses = await prisma.expense.findMany({
    include: {
      card: true,
    },
    where: {
      deletedAt: null,
    },
  });

  const headers = [
    'Expense ID',
    'Description',
    'Amount',
    'Card Name',
    'Card Last4',
    'Transaction Date',
    'Created At'
  ];

  const rows = expenses.map((expense: any) => [
    expense.id,
    expense.description || '',
    expense.amount?.toString() || '0',
    expense.card?.name || '',
    expense.card?.last4 || '',
    expense.transactionDate?.toISOString() || '',
    expense.createdAt?.toISOString() || ''
  ]);

  return generateCSV(headers, rows);
}

function generateCSV(headers: string[], rows: string[][]): string {
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
  ].join('\n');

  return csvContent;
} 