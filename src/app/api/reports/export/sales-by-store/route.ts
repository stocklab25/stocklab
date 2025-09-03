import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { verifySupabaseAuth } from '@/lib/supabase-auth';

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
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const storeId = searchParams.get('storeId');
    const status = searchParams.get('status');

    // Build where clause
    const whereClause: any = {
      deletedAt: null,
    };

    // Add date range filter
    if (startDate && endDate) {
      whereClause.saleDate = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    } else if (startDate) {
      whereClause.saleDate = {
        gte: new Date(startDate),
      };
    } else if (endDate) {
      whereClause.saleDate = {
        lte: new Date(endDate),
      };
    }

    // Add store filter
    if (storeId && storeId !== 'all') {
      whereClause.storeId = storeId;
    }

    // Add status filter
    if (status && status !== 'all') {
      whereClause.status = status;
    }

    // Fetch sales data with related information
    const sales = await prisma.sale.findMany({
      where: whereClause,
      include: {
        store: true,
        inventoryItem: {
          include: {
            product: true,
          },
        },
      },
      orderBy: {
        saleDate: 'desc',
      },
    });

    // Get current store inventory counts (each row = 1 item, only IN_STOCK items)
    const storeInventoryCounts = await prisma.storeInventory.groupBy({
      by: ['storeId'],
      where: {
        deletedAt: null,
        status: 'IN_STOCK'
      },
      _count: {
        id: true
      }
    });

    // Create a map of store inventory counts
    const inventoryCountMap = storeInventoryCounts.reduce((acc: any, item) => {
      acc[item.storeId] = item._count.id || 0;
      return acc;
    }, {});

    // Process data to get store-level aggregations
    const storeStats = sales.reduce((acc: any, sale) => {
      const storeId = sale.storeId;
      const storeName = sale.store?.name || 'Unknown Store';
      
      if (!acc[storeId]) {
        acc[storeId] = {
          storeId,
          storeName,
          totalRevenue: 0,
          totalProfit: 0,
          totalItems: 0,
          completedSales: 0,
          refundedSales: 0,
          refundedAmount: 0,
          inStockCount: inventoryCountMap[storeId] || 0,
          sales: [],
        };
      }

      const revenue = Number(sale.payout || 0) - Number(sale.discount || 0);
      const cost = Number(sale.cost || 0) * Number(sale.quantity || 1);
      const profit = revenue - cost; // Payout - Cost = Profit

      acc[storeId].sales.push(sale);

      if (sale.status === 'COMPLETED') {
        acc[storeId].totalRevenue += revenue;
        acc[storeId].totalProfit += profit;
        acc[storeId].totalItems += sale.quantity || 1;
        acc[storeId].completedSales += 1;
      } else if (sale.status === 'REFUNDED') {
        acc[storeId].refundedSales += 1;
        acc[storeId].refundedAmount += revenue;
      }

      return acc;
    }, {});

    // Calculate net profit (completed sales minus refunded amounts)
    Object.values(storeStats).forEach((store: any) => {
      store.netProfit = store.totalProfit - store.refundedAmount;
      store.profitMargin = store.totalRevenue > 0 ? (store.netProfit / store.totalRevenue) * 100 : 0;
    });

    // Convert to array and sort by total revenue
    const storeStatsArray = Object.values(storeStats).sort((a: any, b: any) => b.totalRevenue - a.totalRevenue);

    // Calculate overall totals
    const overallStats = {
      totalRevenue: storeStatsArray.reduce((sum: number, store: any) => sum + store.totalRevenue, 0),
      totalNetProfit: storeStatsArray.reduce((sum: number, store: any) => sum + store.netProfit, 0),
      totalItems: storeStatsArray.reduce((sum: number, store: any) => sum + store.totalItems, 0),
      totalCompletedSales: storeStatsArray.reduce((sum: number, store: any) => sum + store.completedSales, 0),
      totalRefundedSales: storeStatsArray.reduce((sum: number, store: any) => sum + store.refundedSales, 0),
      totalRefundedAmount: storeStatsArray.reduce((sum: number, store: any) => sum + store.refundedAmount, 0),
      totalInStockCount: storeStatsArray.reduce((sum: number, store: any) => sum + store.inStockCount, 0),
      activeStores: storeStatsArray.length,
      profitMargin: 0,
    };

    // Calculate overall profit margin
    overallStats.profitMargin = overallStats.totalRevenue > 0 ? (overallStats.totalNetProfit / overallStats.totalRevenue) * 100 : 0;

    // Generate CSV content
    const csvHeaders = [
      'Store Name',
      'Total Revenue',
      'Net Profit',
      'Profit Margin (%)',
      'Items Sold',
      'In Stock Count',
      'Completed Sales',
      'Refunded Sales',
      'Refunded Amount',
      'Average Sale Value',
      'Average Profit per Sale'
    ];

    const csvRows = storeStatsArray.map((store: any) => {
      const avgSaleValue = store.completedSales > 0 ? store.totalRevenue / store.completedSales : 0;
      const avgProfitPerSale = store.completedSales > 0 ? store.netProfit / store.completedSales : 0;
      
      return [
        store.storeName,
        store.totalRevenue.toFixed(2),
        store.netProfit.toFixed(2),
        store.profitMargin.toFixed(2),
        store.totalItems,
        store.inStockCount,
        store.completedSales,
        store.refundedSales,
        store.refundedAmount.toFixed(2),
        avgSaleValue.toFixed(2),
        avgProfitPerSale.toFixed(2)
      ];
    });

    // Add summary row
    const summaryRow = [
      'TOTAL',
      overallStats.totalRevenue.toFixed(2),
      overallStats.totalNetProfit.toFixed(2),
      overallStats.profitMargin.toFixed(2),
      overallStats.totalItems,
      overallStats.totalInStockCount,
      overallStats.totalCompletedSales,
      overallStats.totalRefundedSales,
      overallStats.totalRefundedAmount.toFixed(2),
      (overallStats.totalCompletedSales > 0 ? overallStats.totalRevenue / overallStats.totalCompletedSales : 0).toFixed(2),
      (overallStats.totalCompletedSales > 0 ? overallStats.totalNetProfit / overallStats.totalCompletedSales : 0).toFixed(2)
    ];

    // Combine headers, data rows, and summary
    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row => row.join(',')),
      '', // Empty row for separation
      summaryRow.join(',')
    ].join('\n');

    // Add metadata at the top
    const metadata = [
      'Sales by Store Report',
      `Generated on: ${new Date().toLocaleString()}`,
      `Date Range: ${startDate || 'All time'} to ${endDate || 'Present'}`,
      `Store Filter: ${storeId === 'all' ? 'All Stores' : (storeStatsArray.find((s: any) => s.storeId === storeId) as any)?.storeName || 'Unknown'}`,
      `Status Filter: ${status === 'all' ? 'All Statuses' : status}`,
      `Total Sales Records: ${sales.length}`,
      ''
    ].join('\n');

    const finalCsvContent = metadata + csvContent;

    return new NextResponse(finalCsvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="sales-by-store-report-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error('Error exporting sales by store report:', error);
    return NextResponse.json(
      { error: 'Failed to export sales by store report' },
      { status: 500 }
    );
  }
}
