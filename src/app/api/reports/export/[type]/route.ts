import { NextRequest, NextResponse } from 'next/server';
import { verifySupabaseAuth } from '@/lib/supabase-auth';
import prisma from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  try {
    const { user, isValid } = await verifySupabaseAuth(request);
    if (!isValid || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - Authentication required' },
        { status: 401 }
      );
    }

    const { type } = await params;
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'csv';


    let data: any = {};

    switch (type) {
      case 'inventory':
        try {
          data = await prisma.inventoryItem.findMany({
            where: { deletedAt: null },
            include: {
              product: true,
            },
            orderBy: { createdAt: 'desc' },
          });
        } catch (error) {
          console.error('Error fetching inventory data:', error);
          return NextResponse.json(
            { error: 'Failed to fetch inventory data' },
            { status: 500 }
          );
        }
        break;

      case 'store-inventory':
        data = await prisma.storeInventory.findMany({
          where: { deletedAt: null },
          include: {
            store: true,
            inventoryItem: {
              include: {
                product: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        });
        break;

      case 'inventory-summary':
        data = await prisma.inventoryItem.findMany({
          where: { deletedAt: null },
          include: {
            product: true,
          },
          orderBy: { createdAt: 'desc' },
        });
        break;

      case 'value-report':
        data = await prisma.inventoryItem.findMany({
          where: { deletedAt: null },
          include: {
            product: true,
          },
          orderBy: { createdAt: 'desc' },
        });
        break;

      case 'sales':
        data = await prisma.sale.findMany({
          where: { deletedAt: null },
          include: {
            store: true,
            inventoryItem: {
              include: {
                product: true,
              },
            },
          },
          orderBy: { saleDate: 'desc' },
        });
        break;

      case 'monthly-sales':
        const currentMonth = new Date();
        const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
        const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
        
        data = await prisma.sale.findMany({
          where: {
            deletedAt: null,
            saleDate: {
              gte: startOfMonth,
              lte: endOfMonth,
            },
          },
          include: {
            store: true,
            inventoryItem: {
              include: {
                product: true,
              },
            },
          },
          orderBy: { saleDate: 'desc' },
        });
        break;

      case 'annual-sales':
        const currentYear = new Date();
        const startOfYear = new Date(currentYear.getFullYear(), 0, 1);
        const endOfYear = new Date(currentYear.getFullYear(), 11, 31);
        
        data = await prisma.sale.findMany({
          where: {
            deletedAt: null,
            saleDate: {
              gte: startOfYear,
              lte: endOfYear,
            },
          },
          include: {
            store: true,
            inventoryItem: {
              include: {
                product: true,
              },
            },
          },
          orderBy: { saleDate: 'desc' },
        });
        break;

             case 'transactions':
         data = await prisma.stockTransaction.findMany({
           where: { deletedAt: null },
           include: {
             InventoryItem: {
               include: {
                 product: true,
               },
             },
             user: {
               select: {
                 id: true,
                 name: true,
                 email: true,
               },
             },
           },
           orderBy: { date: 'desc' },
         });
        break;

      case 'expenses':
        try {
          // First check if there are any cards in the database
          const cardCount = await prisma.card.count({
            where: { deletedAt: null }
          });
          
        data = await prisma.expense.findMany({
          where: { deletedAt: null },
          include: {
            card: true,
          },
          orderBy: { transactionDate: 'desc' },
          });
          
        } catch (error) {
          console.error('Error fetching expenses data:', error);
          return NextResponse.json(
            { error: 'Failed to fetch expenses data' },
            { status: 500 }
          );
        }
        break;

      case 'purchase-orders':
        data = await prisma.purchaseOrder.findMany({
          where: { deletedAt: null },
          include: {
            purchaseOrderItems: {
              include: {
                product: true,
              },
            },
          },
          orderBy: { orderDate: 'desc' },
        });
        break;

      case 'products':
        data = await prisma.product.findMany({
          where: { deletedAt: null },
          include: {
            inventoryItems: {
              where: { deletedAt: null },
            },
          },
          orderBy: { createdAt: 'desc' },
        });
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid report type' },
          { status: 400 }
        );
    }

    if (format === 'csv') {
      // Convert to CSV format
      const csvData = convertToCSV(data, type);
      
      if (!csvData || csvData.length === 0) {
        return NextResponse.json(
          { error: `No data available for ${type} report` },
          { status: 404 }
        );
      }
      
      return new NextResponse(csvData, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${type}-report.csv"`,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data,
      type,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    );
  }
}

function convertToCSV(data: any[], type: string): string {
  if (!data || data.length === 0) {
    return '';
  }

  let headers: string[] = [];
  let csvRows: string[] = [];

  // Helper function to escape CSV values
  const escapeCSV = (value: any): string => {
    if (value === null || value === undefined) return '';
    const stringValue = String(value);
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
  };

  switch (type) {
    case 'inventory-summary':
      headers = [
        'Product Brand',
        'Product Name',
        'Product SKU',
        'SL SKU',
        'Size',
        'Condition',
        'Quantity',
        'Cost',
        'Total Value',
        'Created Date'
      ];
      
      for (const item of data) {
        const totalValue = (item.cost || 0) * (item.quantity || 1);
        csvRows.push([
          escapeCSV(item.product?.brand || ''),
          escapeCSV(item.product?.name || ''),
          escapeCSV(item.product?.sku || ''),
          escapeCSV(item.stocklabSku || ''),
          escapeCSV(item.size || ''),
          escapeCSV(item.condition || ''),
          escapeCSV(item.quantity || 0),
          escapeCSV(item.cost || 0),
          escapeCSV(totalValue),
          escapeCSV(item.createdAt ? new Date(item.createdAt).toISOString().split('T')[0] : '')
        ].join(','));
      }
      break;

    case 'value-report':
      headers = [
        'Product Brand',
        'Product Name',
        'Product SKU',
        'SL SKU',
        'Size',
        'Condition',
        'Quantity',
        'Cost',
        'Total Value',
        'Cost Range',
        'Created Date'
      ];
      
      for (const item of data) {
        const cost = item.cost || 0;
        const quantity = item.quantity || 1;
        const totalValue = cost * quantity;
        
        let costRange = '';
        if (cost < 50) costRange = 'Under $50';
        else if (cost < 100) costRange = '$50 - $100';
        else if (cost < 200) costRange = '$100 - $200';
        else if (cost < 500) costRange = '$200 - $500';
        else costRange = 'Over $500';

        csvRows.push([
          escapeCSV(item.product?.brand || ''),
          escapeCSV(item.product?.name || ''),
          escapeCSV(item.product?.sku || ''),
          escapeCSV(item.stocklabSku || ''),
          escapeCSV(item.size || ''),
          escapeCSV(item.condition || ''),
          escapeCSV(quantity),
          escapeCSV(cost),
          escapeCSV(totalValue),
          escapeCSV(costRange),
          escapeCSV(item.createdAt ? new Date(item.createdAt).toISOString().split('T')[0] : '')
        ].join(','));
      }
      break;

    case 'inventory':
      headers = [
        'Product Brand',
        'Product Name',
        'Product SKU',
        'SL SKU',
        'Size',
        'Condition',
        'Quantity',
        'Cost',
        'Total Value',
        'Created Date'
      ];
      
      for (const item of data) {
        const totalValue = (item.cost || 0) * (item.quantity || 1);
        csvRows.push([
          escapeCSV(item.product?.brand || ''),
          escapeCSV(item.product?.name || ''),
          escapeCSV(item.product?.sku || ''),
          escapeCSV(item.stocklabSku || ''),
          escapeCSV(item.size || ''),
          escapeCSV(item.condition || ''),
          escapeCSV(item.quantity || 0),
          escapeCSV(item.cost || 0),
          escapeCSV(totalValue),
          escapeCSV(item.createdAt ? new Date(item.createdAt).toISOString().split('T')[0] : '')
        ].join(','));
      }
      break;

    case 'sales':
      headers = [
        'Sale Date',
        'Store',
        'Product Brand',
        'Product Name',
        'Product SKU',
        'SL SKU',
        'Quantity',
        'Cost',
        'Payout',
        'Discount',
        'Profit',
        'Status',
        'Notes'
      ];
      
      for (const sale of data) {
        const profit = (sale.payout - sale.discount) - (sale.cost * sale.quantity);
        csvRows.push([
          escapeCSV(sale.saleDate ? new Date(sale.saleDate).toISOString().split('T')[0] : ''),
          escapeCSV(sale.store?.name || ''),
          escapeCSV(sale.inventoryItem?.product?.brand || ''),
          escapeCSV(sale.inventoryItem?.product?.name || ''),
          escapeCSV(sale.inventoryItem?.product?.sku || ''),
          escapeCSV(sale.inventoryItem?.product?.stocklabSku || ''),
          escapeCSV(sale.quantity || 0),
          escapeCSV(sale.cost || 0),
          escapeCSV(sale.payout || 0),
          escapeCSV(sale.discount || 0),
          escapeCSV(profit),
          escapeCSV(sale.status || 'COMPLETED'),
          escapeCSV(sale.notes || '')
        ].join(','));
      }
      break;

    case 'store-inventory':
      headers = [
        'Store Name',
        'Product Brand',
        'Product Name',
        'Product SKU',
        'SL SKU',
        'Store SKU',
        'Size',
        'Condition',
        'Quantity',
        'Transfer Cost',
        'Total Value',
        'Created Date'
      ];
      
      for (const item of data) {
        const totalValue = (item.transferCost || 0) * (item.quantity || 1);
        csvRows.push([
          escapeCSV(item.store?.name || ''),
          escapeCSV(item.inventoryItem?.product?.brand || ''),
          escapeCSV(item.inventoryItem?.product?.name || ''),
          escapeCSV(item.inventoryItem?.product?.sku || ''),
          escapeCSV(item.inventoryItem?.product?.stocklabSku || ''),
          escapeCSV(item.storeSku || ''),
          escapeCSV(item.inventoryItem?.size || ''),
          escapeCSV(item.inventoryItem?.condition || ''),
          escapeCSV(item.quantity || 0),
          escapeCSV(item.transferCost || 0),
          escapeCSV(totalValue),
          escapeCSV(item.createdAt ? new Date(item.createdAt).toISOString().split('T')[0] : '')
        ].join(','));
      }
      break;

    case 'monthly-sales':
    case 'annual-sales':
      headers = [
        'Sale Date',
        'Store',
        'Product Brand',
        'Product Name',
        'Product SKU',
        'SL SKU',
        'Quantity',
        'Cost',
        'Payout',
        'Discount',
        'Profit',
        'Status',
        'Notes'
      ];
      
      for (const sale of data) {
        const profit = (sale.payout - sale.discount) - (sale.cost * sale.quantity);
        csvRows.push([
          escapeCSV(sale.saleDate ? new Date(sale.saleDate).toISOString().split('T')[0] : ''),
          escapeCSV(sale.store?.name || ''),
          escapeCSV(sale.inventoryItem?.product?.brand || ''),
          escapeCSV(sale.inventoryItem?.product?.name || ''),
          escapeCSV(sale.inventoryItem?.product?.sku || ''),
          escapeCSV(sale.inventoryItem?.product?.stocklabSku || ''),
          escapeCSV(sale.quantity || 0),
          escapeCSV(sale.cost || 0),
          escapeCSV(sale.payout || 0),
          escapeCSV(sale.discount || 0),
          escapeCSV(profit),
          escapeCSV(sale.status || 'COMPLETED'),
          escapeCSV(sale.notes || '')
        ].join(','));
      }
      break;

    case 'purchase-orders':
      headers = [
        'Order Date',
        'Order Number',
        'R3V PO Number',
        'Vendor Name',
        'Status',
        'Total Amount',
        'Delivery Date',
        'Notes'
      ];
      
      for (const order of data) {
        csvRows.push([
          escapeCSV(order.orderDate ? new Date(order.orderDate).toISOString().split('T')[0] : ''),
          escapeCSV(order.orderNumber || ''),
          escapeCSV(order.r3vPurchaseOrderNumber || ''),
          escapeCSV(order.vendorName || ''),
          escapeCSV(order.status || ''),
          escapeCSV(order.totalAmount || 0),
          escapeCSV(order.deliveryDate ? new Date(order.deliveryDate).toISOString().split('T')[0] : ''),
          escapeCSV(order.notes || '')
        ].join(','));
      }
      break;

    case 'expenses':
      headers = [
        'Transaction Date',
        'Description',
        'Amount',
        'Category',
        'Card Name',
        'Card Last 4'
      ];
      
      if (data.length === 0) {
        // Return headers only if no data
        return headers.join(',');
      }
      
      for (const expense of data) {
        
        // Handle Decimal type properly
        const amount = typeof expense.amount === 'object' && expense.amount !== null 
          ? parseFloat(expense.amount.toString()) 
          : parseFloat(expense.amount || 0);
        
        csvRows.push([
          escapeCSV(expense.transactionDate ? new Date(expense.transactionDate).toISOString().split('T')[0] : ''),
          escapeCSV(expense.description || ''),
          escapeCSV(amount),
          escapeCSV(expense.category || ''),
          escapeCSV(expense.card?.name || ''),
          escapeCSV(expense.card?.last4 || '')
        ].join(','));
      }
      break;

    default:
      // Generic CSV conversion for other types
      headers = Object.keys(data[0]);
      csvRows = [];

  for (const row of data) {
    const values = headers.map(header => {
      const value = row[header];
          return escapeCSV(value);
    });
    csvRows.push(values.join(','));
      }
  }

  return [headers.join(','), ...csvRows].join('\n');
} 