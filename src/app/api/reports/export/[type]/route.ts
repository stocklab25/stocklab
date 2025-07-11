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
    const format = searchParams.get('format') || 'json';

    let data: any = {};

    switch (type) {
      case 'inventory':
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
        data = await prisma.expense.findMany({
          where: { deletedAt: null },
          include: {
            card: true,
          },
          orderBy: { transactionDate: 'desc' },
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
      const csvData = convertToCSV(data);
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

function convertToCSV(data: any[]): string {
  if (data.length === 0) return '';

  const headers = Object.keys(data[0]);
  const csvRows = [headers.join(',')];

  for (const row of data) {
    const values = headers.map(header => {
      const value = row[header];
      if (value === null || value === undefined) return '';
      if (typeof value === 'object') return JSON.stringify(value);
      return String(value).replace(/"/g, '""');
    });
    csvRows.push(values.join(','));
  }

  return csvRows.join('\n');
} 