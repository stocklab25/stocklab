import { NextRequest, NextResponse } from 'next/server';
import { verifySupabaseAuth } from '@/lib/supabase-auth';
import prisma from '@/lib/db';

interface ReportFilters {
  type: string;
  store: string;
  startDate?: string;
  endDate?: string;
  status: string;
  itemType: string;
}

interface InventorySummaryData {
  totalValue: number;
  totalItems: number;
  lowStockItems: number;
  topBrands: { brand: string; count: number }[];
  recentActivity: { type: string; count: number }[];
  filteredInventory: any[];
}

interface SalesSummaryData {
  totalSales: number;
  totalProfit: number;
  totalItems: number;
  completedSales: number;
  refundedSales: number;
  refundedAmount: number;
  salesByStore: any[];
  monthlyTrends: any[];
}

interface StoreValueData {
  storeId: string;
  storeName: string;
  totalValue: number;
  itemCount: number;
  status: string;
}

export async function GET(req: NextRequest) {
  const requestId = Math.random().toString(36).substr(2, 9);
  const startTime = Date.now();
  
  console.log(`🔍 [${requestId}] ===== REPORTS API START =====`);
  console.log(`🔍 [${requestId}] Timestamp: ${new Date().toISOString()}`);
  console.log(`🔍 [${requestId}] Request URL: ${req.url}`);
  console.log(`🔍 [${requestId}] Request method: ${req.method}`);
  
  try {
    // Authentication
    console.log(`🔍 [${requestId}] Step 1: Authentication`);
    const { user, isValid } = await verifySupabaseAuth(req);
    if (!isValid || !user) {
      console.log(`🔍 [${requestId}] ❌ Authentication failed`);
      return NextResponse.json(
        { error: 'Unauthorized - Authentication required' },
        { status: 401 }
      );
    }
    console.log(`🔍 [${requestId}] ✅ Authentication successful for user: ${user.email}`);

    // Parse query parameters
    console.log(`🔍 [${requestId}] Step 2: Parsing query parameters`);
    const { searchParams } = new URL(req.url);
    const filters: ReportFilters = {
      type: searchParams.get('type') || 'summary',
      store: searchParams.get('store') || 'all',
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      status: searchParams.get('status') || 'all',
      itemType: searchParams.get('itemType') || 'all'
    };
    
    console.log(`🔍 [${requestId}] Query parameters:`, JSON.stringify(filters, null, 2));

    // Build base where clauses
    console.log(`🔍 [${requestId}] Step 3: Building where clauses`);
    const inventoryWhere: any = {
      deletedAt: null
    };
    
    const salesWhere: any = {
      deletedAt: null
    };
    
    const storeInventoryWhere: any = {
      deletedAt: null
    };

    // Apply date filters
    if (filters.startDate && filters.endDate) {
      const startDate = new Date(filters.startDate);
      const endDate = new Date(filters.endDate);
      endDate.setHours(23, 59, 59, 999);
      
      inventoryWhere.createdAt = {
        gte: startDate,
        lte: endDate
      };
      
      salesWhere.saleDate = {
        gte: startDate,
        lte: endDate
      };
      
      storeInventoryWhere.createdAt = {
        gte: startDate,
        lte: endDate
      };
    }

    // Apply store filter
    if (filters.store !== 'all') {
      salesWhere.storeId = filters.store;
      storeInventoryWhere.storeId = filters.store;
    }

    // Apply status filter
    if (filters.status !== 'all') {
      salesWhere.status = filters.status;
      storeInventoryWhere.status = filters.status;
    }

    console.log(`🔍 [${requestId}] Where clauses:`, {
      inventory: inventoryWhere,
      sales: salesWhere,
      storeInventory: storeInventoryWhere
    });

    // Fetch all data in parallel
    console.log(`🔍 [${requestId}] Step 4: Fetching data from database`);
    
    const [
      inventoryItems,
      storeInventoryItems,
      salesData,
      storesData,
      expensesData,
      productsData,
      transactionsData
    ] = await Promise.all([
      // Inventory items
      prisma.inventoryItem.findMany({
        where: inventoryWhere,
        include: {
          product: {
            select: {
              id: true,
              brand: true,
              name: true,
              itemType: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      
      // Store inventory items
      prisma.storeInventory.findMany({
        where: storeInventoryWhere,
        include: {
          inventoryItem: {
            include: {
              product: {
                select: {
                  id: true,
                  brand: true,
                  name: true,
                  itemType: true
                }
              }
            }
          },
          store: {
            select: {
              id: true,
              name: true,
              status: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      
      // Sales data
      prisma.sale.findMany({
        where: salesWhere,
        include: {
          inventoryItem: {
            include: {
              product: {
                select: {
                  id: true,
                  brand: true,
                  name: true,
                  itemType: true
                }
              }
            }
          },
          store: {
            select: {
              id: true,
              name: true,
              status: true
            }
          }
        },
        orderBy: { saleDate: 'desc' }
      }),
      
      // Stores data
      prisma.store.findMany({
        where: { deletedAt: null },
        select: {
          id: true,
          name: true,
          status: true
        },
        orderBy: { name: 'asc' }
      }),
      
      // Expenses data
      prisma.expense.findMany({
        where: { deletedAt: null },
        orderBy: { transactionDate: 'desc' }
      }),
      
      // Products data
      prisma.product.findMany({
        where: { deletedAt: null },
        select: {
          id: true,
          brand: true,
          name: true,
          itemType: true
        },
        orderBy: { brand: 'asc' }
      }),
      
      // Transactions data
      prisma.stockTransaction.findMany({
        where: { deletedAt: null },
        orderBy: { date: 'desc' }
      })
    ]);

    console.log(`🔍 [${requestId}] Data fetched successfully:`);
    console.log(`🔍 [${requestId}] - Inventory items: ${inventoryItems.length}`);
    console.log(`🔍 [${requestId}] - Store inventory items: ${storeInventoryItems.length}`);
    console.log(`🔍 [${requestId}] - Sales records: ${salesData.length}`);
    console.log(`🔍 [${requestId}] - Stores: ${storesData.length}`);
    console.log(`🔍 [${requestId}] - Expenses: ${expensesData.length}`);
    console.log(`🔍 [${requestId}] - Products: ${productsData.length}`);
    console.log(`🔍 [${requestId}] - Transactions: ${transactionsData.length}`);

    // Process data based on report type
    console.log(`🔍 [${requestId}] Step 5: Processing data for report type: ${filters.type}`);
    
    let reportData: any = {};
    let summaryData: any = {};

    switch (filters.type) {
      case 'summary':
        console.log(`🔍 [${requestId}] Processing inventory summary report`);
        const inventorySummary = await processInventorySummary(
          inventoryItems, 
          storeInventoryItems, 
          productsData, 
          transactionsData,
          requestId
        );
        reportData = { inventory: inventorySummary };
        summaryData = {
          totalInventoryValue: inventorySummary.totalValue,
          totalItems: inventorySummary.totalItems,
          lowStockItems: inventorySummary.lowStockItems,
          activeStores: storesData.filter(s => s.status === 'ACTIVE').length
        };
        break;

      case 'value':
        console.log(`🔍 [${requestId}] Processing value report (warehouse only)`);
        const valueData = await processValueReport(
          inventoryItems,
          requestId
        );
        reportData = { value: valueData };
        summaryData = {
          totalInventoryValue: valueData.totalValue,
          totalItems: inventoryItems.length,
          lowStockItems: inventoryItems.filter(item => item.quantity <= 5).length,
          activeStores: storesData.filter(s => s.status === 'ACTIVE').length
        };
        break;

      case 'sales':
        console.log(`🔍 [${requestId}] Processing sales report`);
        const salesSummary = await processSalesReport(
          salesData,
          expensesData,
          storesData,
          requestId
        );
        reportData = { sales: salesSummary };
        summaryData = {
          totalInventoryValue: 0, // Not applicable for sales
          totalItems: salesSummary.totalItems,
          lowStockItems: 0, // Not applicable for sales
          activeStores: storesData.filter(s => s.status === 'ACTIVE').length
        };
        break;

      case 'monthly':
        console.log(`🔍 [${requestId}] Processing monthly report`);
        const monthlyData = await processMonthlyReport(
          salesData,
          expensesData,
          requestId
        );
        reportData = { sales: monthlyData };
        summaryData = {
          totalInventoryValue: 0,
          totalItems: monthlyData.totalItems,
          lowStockItems: 0,
          activeStores: storesData.filter(s => s.status === 'ACTIVE').length
        };
        break;

      case 'annual':
        console.log(`🔍 [${requestId}] Processing annual report`);
        const annualData = await processAnnualReport(
          salesData,
          expensesData,
          requestId
        );
        reportData = { sales: annualData };
        summaryData = {
          totalInventoryValue: 0,
          totalItems: annualData.totalItems,
          lowStockItems: 0,
          activeStores: storesData.filter(s => s.status === 'ACTIVE').length
        };
        break;

      case 'trends':
        console.log(`🔍 [${requestId}] Processing trends report`);
        const trendsData = await processTrendsReport(
          salesData,
          transactionsData,
          requestId
        );
        reportData = { trends: trendsData };
        summaryData = {
          totalInventoryValue: 0, // Not applicable for trends
          totalItems: salesData.length,
          lowStockItems: 0,
          activeStores: storesData.filter(s => s.status === 'ACTIVE').length
        };
        break;

      case 'store-value':
        console.log(`🔍 [${requestId}] Processing store value report (store inventory only)`);
        const storeValueData = await processStoreValueReport(
          storeInventoryItems,
          requestId
        );
        reportData = { storeValue: storeValueData };
        summaryData = {
          totalInventoryValue: storeValueData.reduce((sum, store) => sum + store.totalValue, 0),
          totalItems: storeValueData.reduce((sum, store) => sum + store.itemCount, 0),
          lowStockItems: 0, // Store inventory doesn't have low stock concept
          activeStores: storeValueData.length
        };
        break;

      default:
        console.log(`🔍 [${requestId}] Unknown report type: ${filters.type}`);
        return NextResponse.json(
          { error: `Unknown report type: ${filters.type}` },
          { status: 400 }
        );
    }

    console.log(`🔍 [${requestId}] Report data processed:`, JSON.stringify(reportData, null, 2));
    console.log(`🔍 [${requestId}] Summary data:`, JSON.stringify(summaryData, null, 2));

    // Prepare response
    const processingTime = Date.now() - startTime;
    console.log(`🔍 [${requestId}] Total processing time: ${processingTime}ms`);

    const response = {
      success: true,
      data: {
        summary: summaryData,
        reportData,
        filters: {
          applied: filters,
          available: {
            stores: storesData,
            statuses: ['COMPLETED', 'REFUNDED', 'IN_STOCK', 'SOLD', 'RETURNED'],
            itemTypes: [...new Set(productsData.map(p => p.itemType).filter(Boolean))]
          }
        },
        generatedAt: new Date().toISOString(),
        processingTime
      }
    };

    console.log(`🔍 [${requestId}] ===== REPORTS API SUCCESS =====`);
    console.log(`🔍 [${requestId}] Response size: ${JSON.stringify(response).length} characters`);
    
    return NextResponse.json(response);

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error(`🔍 [${requestId}] ===== REPORTS API ERROR =====`);
    console.error(`🔍 [${requestId}] Error after ${processingTime}ms:`, error);
    console.error(`🔍 [${requestId}] Error stack:`, error instanceof Error ? error.stack : 'No stack trace');
    
    return NextResponse.json(
      { 
        error: 'Failed to generate report',
        details: error instanceof Error ? error.message : 'Unknown error',
        processingTime
      },
      { status: 500 }
    );
  }
}

// Helper functions for processing different report types
async function processInventorySummary(
  inventoryItems: any[],
  storeInventoryItems: any[],
  productsData: any[],
  transactionsData: any[],
  requestId: string
): Promise<InventorySummaryData> {
  console.log(`🔍 [${requestId}] Processing inventory summary data`);
  
  // Calculate total value from warehouse inventory only (store inventory are references, not separate items)
  const totalValue = inventoryItems.reduce((sum, item) => {
    const cost = Math.max(0, parseFloat(item.cost || 0));
    const quantity = Math.max(0, item.quantity || 1);
    const itemValue = cost * quantity;
    console.log(`🔍 [${requestId}] Warehouse item: ${item.product?.name || 'Unknown'} - Cost: $${cost}, Qty: ${quantity}, Value: $${itemValue}`);
    return sum + itemValue;
  }, 0);
  
  console.log(`🔍 [${requestId}] Total inventory value (warehouse only): $${totalValue.toFixed(2)}`);
  console.log(`🔍 [${requestId}] Store inventory references: ${storeInventoryItems.length} (not counted as separate value)`);
  
  // Count items by brand
  const brandCounts: { [key: string]: number } = {};
  inventoryItems.forEach(item => {
    const brand = item.product?.brand || 'Unknown';
    brandCounts[brand] = (brandCounts[brand] || 0) + 1;
  });
  
  const topBrands = Object.entries(brandCounts)
    .map(([brand, count]) => ({ brand, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  
  console.log(`🔍 [${requestId}] Top brands:`, topBrands);
  
  // Recent activity by transaction type
  const activityCounts: { [key: string]: number } = {};
  transactionsData.forEach(txn => {
    activityCounts[txn.type] = (activityCounts[txn.type] || 0) + 1;
  });
  
  const recentActivity = Object.entries(activityCounts)
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);
  
  console.log(`🔍 [${requestId}] Recent activity:`, recentActivity);
  
  // Combine warehouse and store inventory for filtered data
  const itemMap = new Map();
  
  // Add warehouse inventory
  inventoryItems.forEach(item => {
    itemMap.set(item.id, {
      ...item,
      totalQuantity: item.quantity || 0,
      locations: ['warehouse']
    });
  });
  
  // Add store inventory
  storeInventoryItems.forEach(storeItem => {
    const key = storeItem.inventoryItemId;
    const existingItem = itemMap.get(key);
    
    if (existingItem) {
      existingItem.totalQuantity += storeItem.quantity || 0;
      existingItem.locations.push(storeItem.store?.name || 'Unknown Store');
    } else {
      itemMap.set(key, {
        ...storeItem.inventoryItem,
        quantity: storeItem.quantity || 0,
        totalQuantity: storeItem.quantity || 0,
        storeSku: storeItem.storeSku,
        transferCost: storeItem.transferCost,
        createdAt: storeItem.createdAt,
        updatedAt: storeItem.updatedAt,
        locations: [storeItem.store?.name || 'Unknown Store']
      });
    }
  });
  
  const filteredInventory = Array.from(itemMap.values());
  console.log(`🔍 [${requestId}] Combined inventory items: ${filteredInventory.length}`);
  
  // Calculate total unique items - only count warehouse inventory items
  // Store inventory items are just references to warehouse items, not separate items
  const totalItems = inventoryItems.length;
  
  // Calculate low stock items from warehouse inventory (store inventory doesn't have low stock concept)
  const lowStockItems = inventoryItems.filter(item => item.quantity <= 5).length;
  
  console.log(`🔍 [${requestId}] Total unique items: ${totalItems} (warehouse inventory only)`);
  console.log(`🔍 [${requestId}] Store inventory references: ${storeInventoryItems.length} (not counted as separate items)`);
  console.log(`🔍 [${requestId}] Low stock items: ${lowStockItems}`);
  
  return {
    totalValue,
    totalItems,
    lowStockItems,
    topBrands,
    recentActivity,
    filteredInventory
  };
}

async function processValueReport(
  inventoryItems: any[],
  requestId: string
): Promise<any> {
  console.log(`🔍 [${requestId}] Processing value report data (warehouse only)`);
  
  // Calculate value from warehouse inventory only
  const totalValue = inventoryItems.reduce((sum, item) => {
    const cost = Math.max(0, parseFloat(item.cost || 0));
    const quantity = Math.max(0, item.quantity || 1);
    const itemValue = cost * quantity;
    console.log(`🔍 [${requestId}] Warehouse item: ${item.product?.name || 'Unknown'} - Cost: $${cost}, Qty: ${quantity}, Value: $${itemValue}`);
    return sum + itemValue;
  }, 0);
  
  console.log(`🔍 [${requestId}] Warehouse total value: $${totalValue.toFixed(2)}`);
  
  // Calculate value by brand from warehouse inventory
  const brandValues: { [key: string]: number } = {};
  inventoryItems.forEach(item => {
    const brand = item.product?.brand || 'Unknown';
    const cost = Math.max(0, parseFloat(item.cost || 0));
    const quantity = Math.max(0, item.quantity || 1);
    const itemValue = cost * quantity;
    brandValues[brand] = (brandValues[brand] || 0) + itemValue;
  });
  
  const valueByBrand = Object.entries(brandValues)
    .map(([brand, value]) => ({ brand, value }))
    .sort((a, b) => b.value - a.value);
  
  console.log(`🔍 [${requestId}] Value by brand:`, valueByBrand);
  
  return {
    totalValue,
    valueByBrand,
    filteredInventory: inventoryItems // For the chart
  };
}

async function processSalesReport(
  salesData: any[],
  expensesData: any[],
  storesData: any[],
  requestId: string
): Promise<SalesSummaryData> {
  console.log(`🔍 [${requestId}] Processing sales report data`);
  
  let totalSales = 0;
  let totalProfit = 0;
  let totalItems = 0;
  let completedSales = 0;
  let refundedSales = 0;
  let refundedAmount = 0;
  
  salesData.forEach(sale => {
    const payout = Math.max(0, Number(sale.payout) || 0);
    const discount = Math.max(0, Number(sale.discount) || 0);
    const cost = Math.max(0, Number(sale.cost) || 0);
    const quantity = Math.max(0, Number(sale.quantity) || 1);
    
    if (sale.status === 'COMPLETED') {
      totalSales += payout - discount;
      totalProfit += (payout - discount) - (cost * quantity);
      totalItems += quantity;
      completedSales++;
    } else if (sale.status === 'REFUNDED') {
      refundedSales++;
      refundedAmount += payout - discount;
    }
  });
  
  console.log(`🔍 [${requestId}] Sales summary:`, {
    totalSales: totalSales.toFixed(2),
    totalProfit: totalProfit.toFixed(2),
    totalItems,
    completedSales,
    refundedSales
  });
  
  return {
    totalSales,
    totalProfit,
    totalItems,
    completedSales,
    refundedSales,
    refundedAmount,
    salesByStore: [], // Will be calculated
    monthlyTrends: [] // Will be calculated
  };
}

async function processMonthlyReport(
  salesData: any[],
  expensesData: any[],
  requestId: string
): Promise<any> {
  console.log(`🔍 [${requestId}] Processing monthly report data`);
  
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  
  const monthlySales = salesData.filter(sale => {
    const date = sale.saleDate ? new Date(sale.saleDate) : null;
    return date && date.getFullYear() === currentYear && date.getMonth() === currentMonth;
  });
  
  console.log(`🔍 [${requestId}] Monthly sales count: ${monthlySales.length}`);
  
  return await processSalesReport(monthlySales, expensesData, [], requestId);
}

async function processAnnualReport(
  salesData: any[],
  expensesData: any[],
  requestId: string
): Promise<any> {
  console.log(`🔍 [${requestId}] Processing annual report data`);
  
  const now = new Date();
  const currentYear = now.getFullYear();
  
  const annualSales = salesData.filter(sale => {
    const date = sale.saleDate ? new Date(sale.saleDate) : null;
    return date && date.getFullYear() === currentYear;
  });
  
  console.log(`🔍 [${requestId}] Annual sales count: ${annualSales.length}`);
  
  return await processSalesReport(annualSales, expensesData, [], requestId);
}

async function processStoreValueReport(
  storeInventoryItems: any[],
  requestId: string
): Promise<StoreValueData[]> {
  console.log(`🔍 [${requestId}] Processing store value report data`);
  
  const storeValues: { [key: string]: StoreValueData } = {};
  
  storeInventoryItems.forEach(item => {
    if (item.deletedAt || (item.status !== 'IN_STOCK' && item.status !== 'SOLD')) {
      return;
    }
    
    const storeId = item.storeId;
    const storeName = item.store?.name || 'Unknown Store';
    const quantity = Math.max(0, item.quantity || 0);
    const cost = Math.max(0, Number(item.inventoryItem?.cost || 0));
    const itemValue = cost * quantity;
    
    if (!storeValues[storeId]) {
      storeValues[storeId] = {
        storeId,
        storeName,
        totalValue: 0,
        itemCount: 0,
        status: item.store?.status || 'UNKNOWN'
      };
    }
    
    storeValues[storeId].totalValue += itemValue;
    storeValues[storeId].itemCount += quantity;
  });
  
  const result = Object.values(storeValues).sort((a, b) => b.totalValue - a.totalValue);
  console.log(`🔍 [${requestId}] Store values calculated for ${result.length} stores`);
  
  return result;
}

async function processTrendsReport(
  salesData: any[],
  transactionsData: any[],
  requestId: string
): Promise<any> {
  console.log(`🔍 [${requestId}] Processing trends report data`);
  console.log(`🔍 [${requestId}] Sales data count: ${salesData.length}`);
  console.log(`🔍 [${requestId}] Transactions data count: ${transactionsData.length}`);
  
  // Process store sales trends
  const storeSalesTrends = new Map();
  const brandSalesTrends = new Map();
  const itemTypeSalesTrends = new Map();
  
  // Process sales data for store trends
  salesData.forEach(sale => {
    const saleDate = new Date(sale.saleDate);
    const monthKey = `${saleDate.getFullYear()}-${String(saleDate.getMonth() + 1).padStart(2, '0')}`;
    const storeId = sale.storeId;
    const storeName = sale.store?.name || 'Unknown Store';
    const brand = sale.inventoryItem?.product?.brand || 'Unknown Brand';
    const itemType = sale.inventoryItem?.product?.itemType || 'Unknown Type';
    
    // Store trends
    if (!storeSalesTrends.has(storeId)) {
      storeSalesTrends.set(storeId, {
        storeName,
        monthlyData: new Map(),
        totalRevenue: 0,
        totalItems: 0,
        totalSales: 0
      });
    }
    
    const storeTrend = storeSalesTrends.get(storeId);
    if (!storeTrend.monthlyData.has(monthKey)) {
      storeTrend.monthlyData.set(monthKey, {
        revenue: 0,
        items: 0,
        sales: 0
      });
    }
    
    const revenue = (sale.payout || 0) - (sale.discount || 0);
    const quantity = sale.quantity || 1;
    
    storeTrend.monthlyData.get(monthKey).revenue += revenue;
    storeTrend.monthlyData.get(monthKey).items += quantity;
    storeTrend.monthlyData.get(monthKey).sales += 1;
    
    storeTrend.totalRevenue += revenue;
    storeTrend.totalItems += quantity;
    storeTrend.totalSales += 1;
    
    // Brand trends
    if (!brandSalesTrends.has(brand)) {
      brandSalesTrends.set(brand, {
        monthlyData: new Map(),
        totalRevenue: 0,
        totalItems: 0,
        totalSales: 0
      });
    }
    
    const brandTrend = brandSalesTrends.get(brand);
    if (!brandTrend.monthlyData.has(monthKey)) {
      brandTrend.monthlyData.set(monthKey, {
        revenue: 0,
        items: 0,
        sales: 0
      });
    }
    
    brandTrend.monthlyData.get(monthKey).revenue += revenue;
    brandTrend.monthlyData.get(monthKey).items += quantity;
    brandTrend.monthlyData.get(monthKey).sales += 1;
    
    brandTrend.totalRevenue += revenue;
    brandTrend.totalItems += quantity;
    brandTrend.totalSales += 1;
    
    // Item type trends
    if (!itemTypeSalesTrends.has(itemType)) {
      itemTypeSalesTrends.set(itemType, {
        monthlyData: new Map(),
        totalRevenue: 0,
        totalItems: 0,
        totalSales: 0
      });
    }
    
    const itemTypeTrend = itemTypeSalesTrends.get(itemType);
    if (!itemTypeTrend.monthlyData.has(monthKey)) {
      itemTypeTrend.monthlyData.set(monthKey, {
        revenue: 0,
        items: 0,
        sales: 0
      });
    }
    
    itemTypeTrend.monthlyData.get(monthKey).revenue += revenue;
    itemTypeTrend.monthlyData.get(monthKey).items += quantity;
    itemTypeTrend.monthlyData.get(monthKey).sales += 1;
    
    itemTypeTrend.totalRevenue += revenue;
    itemTypeTrend.totalItems += quantity;
    itemTypeTrend.totalSales += 1;
  });
  
  // Get all unique months
  const allMonths = new Set();
  storeSalesTrends.forEach(store => {
    store.monthlyData.forEach((_: any, month: any) => allMonths.add(month));
  });
  const sortedMonths = Array.from(allMonths).sort();
  
  // Convert to arrays for easier consumption
  const storeTrendsArray = Array.from(storeSalesTrends.entries()).map(([storeId, data]) => ({
    storeId,
    storeName: data.storeName,
    totalRevenue: data.totalRevenue,
    totalItems: data.totalItems,
    totalSales: data.totalSales,
    monthlyData: (Array.from(data.monthlyData.entries()) as [string, any][]).map(([month, values]) => ({
      month,
      ...values
    }))
  }));
  
  const brandTrendsArray = Array.from(brandSalesTrends.entries()).map(([brand, data]) => ({
    brand,
    totalRevenue: data.totalRevenue,
    totalItems: data.totalItems,
    totalSales: data.totalSales,
    monthlyData: (Array.from(data.monthlyData.entries()) as [string, any][]).map(([month, values]) => ({
      month,
      ...values
    }))
  }));
  
  const itemTypeTrendsArray = Array.from(itemTypeSalesTrends.entries()).map(([itemType, data]) => ({
    itemType,
    totalRevenue: data.totalRevenue,
    totalItems: data.totalItems,
    totalSales: data.totalSales,
    monthlyData: (Array.from(data.monthlyData.entries()) as [string, any][]).map(([month, values]) => ({
      month,
      ...values
    }))
  }));
  
  console.log(`🔍 [${requestId}] Processed store trends: ${storeTrendsArray.length} stores`);
  console.log(`🔍 [${requestId}] Processed brand trends: ${brandTrendsArray.length} brands`);
  console.log(`🔍 [${requestId}] Processed item type trends: ${itemTypeTrendsArray.length} item types`);
  
  return {
    sales: salesData,
    transactions: transactionsData,
    storeTrends: storeTrendsArray,
    brandTrends: brandTrendsArray,
    itemTypeTrends: itemTypeTrendsArray,
    allMonths: sortedMonths
  };
}
