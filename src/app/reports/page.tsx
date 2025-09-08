'use client';

import { useEffect, useState, useMemo } from 'react';
import Layout from '@/components/Layout';
import { Card } from '@/components/Card';
import { PageLoader } from '@/components/Loader';
import { useReportsData } from '@/hooks';
import { useSettings } from '@/contexts/SettingsContext';
import { useAuth } from '@/contexts/AuthContext';
import InventorySummaryChart from '@/components/charts/InventorySummaryChart';
import ValueReportChart from '@/components/charts/ValueReportChart';
import SalesByStoreChart from '@/components/charts/SalesByStoreChart';
import SalesByStoreReport from '@/components/reports/SalesByStoreReport';
import TrendsAnalysisChart from '@/components/charts/TrendsAnalysisChart';
import ExportReportsModal from '@/components/ExportReportsModal';

interface ReportData {
  totalValue: number;
  totalItems: number;
  lowStockItems: number;
  topBrands: { brand: string; count: number }[];
  recentActivity: { type: string; count: number }[];
}

interface InventoryItem {
  id: string;
  productId: string;
  cost: number;
  quantity: number;
  product?: {
    id: string;
    brand: string;
    name: string;
  };
}

interface Product {
  id: string;
  brand: string;
  name: string;
}

interface Transaction {
  id: string;
  type: string;
  date: string;
}

interface Store {
  id: string;
  name: string;
  status: string;
}

export default function Reports() {
  const { getAuthToken } = useAuth();
  const { 
    inventory, 
    products, 
    transactions, 
    allStoreInventory, 
    salesData: reportsSalesData, 
    storesData: reportsStoresData, 
    expensesData,
    isLoading 
  } = useReportsData();
  const { settings } = useSettings();
  const [selectedReport, setSelectedReport] = useState<string>('summary');
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  
  // Date range and store selection state
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedStore, setSelectedStore] = useState<string>('all');
  const [selectedInventoryStore, setSelectedInventoryStore] = useState<string>('all');
  const [selectedValueStore, setSelectedValueStore] = useState<string>('all');
  const [selectedSaleStatus, setSelectedSaleStatus] = useState<string>('all');
  const [inventoryStartDate, setInventoryStartDate] = useState<string>('');
  const [inventoryEndDate, setInventoryEndDate] = useState<string>('');
  const [valueStartDate, setValueStartDate] = useState<string>('');
  const [valueEndDate, setValueEndDate] = useState<string>('');
  
  // Applied filter states (what's actually being used for calculations)
  const [appliedStartDate, setAppliedStartDate] = useState<string>('');
  const [appliedEndDate, setAppliedEndDate] = useState<string>('');
  const [appliedStore, setAppliedStore] = useState<string>('all');
  const [appliedInventoryStore, setAppliedInventoryStore] = useState<string>('all');
  const [appliedValueStore, setAppliedValueStore] = useState<string>('all');
  const [appliedSaleStatus, setAppliedSaleStatus] = useState<string>('all');
  const [appliedInventoryStartDate, setAppliedInventoryStartDate] = useState<string>('');
  const [appliedInventoryEndDate, setAppliedInventoryEndDate] = useState<string>('');
  const [appliedValueStartDate, setAppliedValueStartDate] = useState<string>('');
  const [appliedValueEndDate, setAppliedValueEndDate] = useState<string>('');
  
  // Apply filter functions
  const handleApplySalesFilters = () => {
    setAppliedStartDate(startDate);
    setAppliedEndDate(endDate);
    setAppliedStore(selectedStore);
    setAppliedSaleStatus(selectedSaleStatus);
  };
  
  const handleApplyInventoryFilters = () => {
    setAppliedInventoryStartDate(inventoryStartDate);
    setAppliedInventoryEndDate(inventoryEndDate);
    setAppliedInventoryStore(selectedInventoryStore);
  };
  
  const handleApplyValueFilters = () => {
    setAppliedValueStartDate(valueStartDate);
    setAppliedValueEndDate(valueEndDate);
    setAppliedValueStore(selectedValueStore);
  };
  
  const [reportData, setReportData] = useState<ReportData>({
    totalValue: 0,
    totalItems: 0,
    lowStockItems: 0,
    topBrands: [],
    recentActivity: [],
  });

  // Use data directly from the hook - no need for local state
  const salesData = Array.isArray(reportsSalesData) ? reportsSalesData : [];
  const storesData = Array.isArray(reportsStoresData) ? reportsStoresData : [];

  // Remove the unnecessary useEffect and use allStoreInventory directly
  // This prevents infinite re-renders caused by SWR creating new array references

  // Filter sales data based on date range, store selection, and status
  const filteredSalesData = useMemo(() => {
    if (!salesData.length) return [];

    return salesData.filter(sale => {
      // Filter by date range
      if (appliedStartDate && appliedEndDate) {
        const saleDate = sale.saleDate ? new Date(sale.saleDate) : null;
        const start = new Date(appliedStartDate);
        const end = new Date(appliedEndDate);
        end.setHours(23, 59, 59, 999); // Include the entire end date
        
        if (!saleDate || saleDate < start || saleDate > end) {
          return false;
        }
      }

      // Filter by store
      if (appliedStore !== 'all' && sale.storeId !== appliedStore) {
        return false;
      }

      // Filter by status
      if (appliedSaleStatus !== 'all' && sale.status !== appliedSaleStatus) {
        return false;
      }

      return true;
    });
  }, [salesData, appliedStartDate, appliedEndDate, appliedStore, appliedSaleStatus]);

  // Filter inventory data for inventory summary based on store selection and date range
  const filteredInventoryData = useMemo(() => {
    // If "all" is selected, combine warehouse and store inventory
    if (appliedInventoryStore === 'all') {
      const warehouseItems = inventory || [];
      const storeItems = allStoreInventory || [];
      
      // Create a map to track items and their quantities across all locations
      const itemMap = new Map();
      
      // Add warehouse inventory (filter out deleted items as extra safety)
      warehouseItems
        .filter((item: any) => !item.deletedAt)
        .forEach((item: any) => {
          const key = item.id;
          itemMap.set(key, {
            ...item,
            totalQuantity: item.quantity || 0,
            locations: ['warehouse']
          });
        });
      
      // Add store inventory and aggregate quantities (filter out deleted items as extra safety)
      storeItems
        .filter((storeItem: any) => !storeItem.deletedAt)
        .forEach((storeItem: any) => {
        const key = storeItem.inventoryItemId;
        const existingItem = itemMap.get(key);
        
        if (existingItem) {
          // Item exists in warehouse, add store quantity
          existingItem.totalQuantity += storeItem.quantity || 0;
          existingItem.locations.push(storeItem.store?.name || 'Unknown Store');
        } else {
          // Item only exists in store
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
      
      let filtered = Array.from(itemMap.values());

      // Filter by date range (using createdAt date)
      if (inventoryStartDate && inventoryEndDate) {
        const start = new Date(inventoryStartDate);
        const end = new Date(inventoryEndDate);
        end.setHours(23, 59, 59, 999); // Include the entire end date
        
        filtered = filtered.filter(item => {
          const itemDate = item.createdAt ? new Date(item.createdAt) : null;
          return itemDate && itemDate >= start && itemDate <= end;
        });
      }

      return filtered;
    }

        // If specific store is selected, use store inventory data
    if (!allStoreInventory || !Array.isArray(allStoreInventory)) return [];
    
    let filtered = allStoreInventory
      .filter(item => !item.deletedAt && item.storeId === appliedInventoryStore)
      .map(item => ({
        ...item.inventoryItem,
        quantity: item.quantity, // Use store quantity instead of warehouse quantity
        storeSku: item.storeSku,
        transferCost: item.transferCost,
        createdAt: item.createdAt, // Use store inventory creation date
        updatedAt: item.updatedAt
      }));

    // Filter by date range (using store inventory createdAt date)
    if (inventoryStartDate && inventoryEndDate) {
      const start = new Date(inventoryStartDate);
      const end = new Date(inventoryEndDate);
      end.setHours(23, 59, 59, 999); // Include the entire end date
      
      filtered = filtered.filter(item => {
        const itemDate = item.createdAt ? new Date(item.createdAt) : null;
        return itemDate && itemDate >= start && itemDate <= end;
      });
    }

    return filtered;
  }, [inventory, allStoreInventory, appliedInventoryStore, appliedInventoryStartDate, appliedInventoryEndDate]);

  // Filter inventory data for value report based on store selection and date range
  const filteredValueInventoryData = useMemo(() => {
    // If "all" is selected, combine warehouse and store inventory
    if (appliedValueStore === 'all') {
      const warehouseItems = inventory || [];
      const storeItems = allStoreInventory || [];
      
      // Create a map to track items and their values across all locations
      const itemMap = new Map();
      
      // Add warehouse inventory (filter out deleted items as extra safety)
      warehouseItems
        .filter((item: any) => !item.deletedAt)
        .forEach((item: any) => {
        const key = item.id;
        const cost = Math.max(0, parseFloat(item.cost || 0));
        const quantity = Math.max(0, item.quantity || 0);
        itemMap.set(key, {
          ...item,
          totalQuantity: quantity,
          totalValue: cost * quantity,
          locations: ['warehouse']
        });
      });
      
      // Add store inventory and aggregate values
      storeItems.forEach((storeItem: any) => {
        const key = storeItem.inventoryItemId;
        const cost = Math.max(0, parseFloat(storeItem.inventoryItem?.cost || 0));
        const quantity = Math.max(0, storeItem.quantity || 0);
        const existingItem = itemMap.get(key);
        
        if (existingItem) {
          // Item exists in warehouse, add store quantity and value
          existingItem.totalQuantity += quantity;
          existingItem.totalValue += cost * quantity;
          existingItem.locations.push(storeItem.store?.name || 'Unknown Store');
        } else {
          // Item only exists in store
          itemMap.set(key, {
            ...storeItem.inventoryItem,
            quantity: quantity,
            totalQuantity: quantity,
            totalValue: cost * quantity,
            storeSku: storeItem.storeSku,
            transferCost: storeItem.transferCost,
            createdAt: storeItem.createdAt,
            updatedAt: storeItem.updatedAt,
            locations: [storeItem.store?.name || 'Unknown Store']
          });
        }
      });
      
      let filtered = Array.from(itemMap.values());

      // Filter by date range (using createdAt date)
      if (appliedValueStartDate && appliedValueEndDate) {
        const start = new Date(appliedValueStartDate);
        const end = new Date(appliedValueEndDate);
        end.setHours(23, 59, 59, 999); // Include the entire end date
        
        filtered = filtered.filter(item => {
          const itemDate = item.createdAt ? new Date(item.createdAt) : null;
          return itemDate && itemDate >= start && itemDate <= end;
        });
      }

      return filtered;
    }

        // If specific store is selected, use store inventory data
    if (!allStoreInventory || !Array.isArray(allStoreInventory)) return [];
    
    let filtered = allStoreInventory
      .filter(item => !item.deletedAt && item.storeId === appliedValueStore)
      .map(item => ({
        ...item.inventoryItem,
        quantity: item.quantity, // Use store quantity instead of warehouse quantity
        storeSku: item.storeSku,
        transferCost: item.transferCost,
        createdAt: item.createdAt, // Use store inventory creation date
        updatedAt: item.updatedAt
      }));

    // Filter by date range (using store inventory createdAt date)
    if (valueStartDate && valueEndDate) {
      const start = new Date(valueStartDate);
      const end = new Date(valueEndDate);
      end.setHours(23, 59, 59, 999); // Include the entire end date
      
      filtered = filtered.filter(item => {
        const itemDate = item.createdAt ? new Date(item.createdAt) : null;
        return itemDate && itemDate >= start && itemDate <= end;
      });
    }

    return filtered;
  }, [inventory, allStoreInventory, appliedValueStore, appliedValueStartDate, appliedValueEndDate]);

  // Calculate report data when data is available
  useEffect(() => {
    if (inventory && products && transactions) {
      try {
        // Ensure inventory is an array
        if (!Array.isArray(inventory)) {
          
          return;
        }

        // Calculate report data - multiply cost by quantity for each item
        const totalValue = inventory.reduce((sum: number, item: InventoryItem) => {
          const cost = Math.max(0, item.cost || 0);
          const quantity = Math.max(0, item.quantity || 1);
          const itemValue = cost * quantity;
          return sum + itemValue;
        }, 0);
        
        // Calculate total value and items from filtered inventory data
        let finalTotalValue = 0;
        let finalTotalItems = 0;
        
        if (filteredInventoryData.length > 0) {
          finalTotalValue = filteredInventoryData.reduce((sum: number, item: any) => {
            const cost = Math.max(0, parseFloat(item.cost || 0));
            const quantity = Math.max(0, item.totalQuantity || item.quantity || 1);
            const itemValue = cost * quantity;
            return sum + itemValue;
          }, 0);
          finalTotalItems = filteredInventoryData.length;
        } else {
          // Fallback to original inventory data if no filtered data
          finalTotalValue = totalValue;
          finalTotalItems = inventory.length;
        }
        
        // Calculate low stock items from filtered data
        const lowStockItems = filteredInventoryData.length > 0 ? 
          filteredInventoryData.filter((item: any) => 
            (item.totalQuantity || item.quantity || 0) <= settings.lowStockThreshold
          ).length : 
          inventory.filter((item: InventoryItem) => 
            item.quantity <= settings.lowStockThreshold
          ).length;
        
        // Count items by brand
        const brandCounts: { [key: string]: number } = {};
        const itemsToCount = filteredInventoryData.length > 0 ? filteredInventoryData : inventory;
        
        itemsToCount.forEach((item: any) => {
          // Try to get brand from product relation first, then fallback to products array
          let brand = '';
          if (item.product?.brand) {
            brand = item.product.brand;
          } else {
            const product = products.find((p: Product) => p.id === item.productId);
            brand = product?.brand || 'Unknown';
          }
          brandCounts[brand] = (brandCounts[brand] || 0) + 1;
        });

        const topBrands = Object.entries(brandCounts)
          .map(([brand, count]) => ({ brand, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);

        // Recent activity by type
        const activityCounts: { [key: string]: number } = {};
        transactions.forEach((txn: Transaction) => {
          activityCounts[txn.type] = (activityCounts[txn.type] || 0) + 1;
        });

        const recentActivity = Object.entries(activityCounts)
          .map(([type, count]) => ({ type, count }))
          .sort((a, b) => b.count - a.count);



        setReportData({
          totalValue: finalTotalValue,
          totalItems: finalTotalItems,
          lowStockItems,
          topBrands,
          recentActivity,
        });
      } catch (error) {
        
      }
    }
  }, [inventory?.length, products?.length, transactions?.length, settings.lowStockThreshold, selectedInventoryStore]);

  // Add monthly and annual sales/profit calculations
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const monthlySales = salesData.filter(sale => {
    const date = sale.saleDate ? new Date(sale.saleDate) : null;
    return date && date.getFullYear() === currentYear && date.getMonth() === currentMonth;
  });
  const annualSales = salesData.filter(sale => {
    const date = sale.saleDate ? new Date(sale.saleDate) : null;
    return date && date.getFullYear() === currentYear;
  });
  const getSalesSummary = (salesArr: any[]) => {
    let totalSales = 0;
    let totalProfit = 0;
    let totalItems = 0;
    let completedSales = 0;
    let refundedSales = 0;
    let refundedAmount = 0;
    
    salesArr.forEach(sale => {
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
        refundedAmount += payout - discount; // Track refunded amount
      }
    });
    
    // Calculate expenses for the same period as sales
    const salesStartDate = salesArr.length > 0 ? new Date(Math.min(...salesArr.map(s => new Date(s.saleDate).getTime()))) : null;
    const salesEndDate = salesArr.length > 0 ? new Date(Math.max(...salesArr.map(s => new Date(s.saleDate).getTime()))) : null;
    
    const periodExpenses = expensesData ? expensesData.reduce((sum: number, expense: any) => {
      const expenseDate = expense.transactionDate ? new Date(expense.transactionDate) : null;
      if (expenseDate && salesStartDate && salesEndDate) {
        if (expenseDate >= salesStartDate && expenseDate <= salesEndDate) {
          return sum + (expense.amount || 0);
        }
      }
      return sum;
    }, 0) : 0;
    
    
    // Calculate net profit (gross profit minus expenses)
    const netProfit = totalProfit - periodExpenses;
    
    return {
      totalSales: Math.max(0, totalSales),
      totalProfit: netProfit,
      totalItems,
      completedSales,
      refundedSales,
      refundedAmount,
    };
  };
  const monthlySummary = getSalesSummary(monthlySales);
  const annualSummary = getSalesSummary(annualSales);

  // Calculate total value per store for investment monitoring
  const storeValueData = useMemo(() => {
    if (!allStoreInventory.length) return [];

    const storeValues: { [key: string]: { name: string; totalValue: number; itemCount: number } } = {};
    
    allStoreInventory.forEach((item) => {
      // Only count items that are not deleted and have IN_STOCK or SOLD status
      if (item.deletedAt || (item.status !== 'IN_STOCK' && item.status !== 'SOLD')) {
        return;
      }

      const storeId = item.storeId;
      const storeName = item.store?.name || 'Unknown Store';
      const quantity = Math.max(0, item.quantity || 0); // Ensure quantity is not negative
      const cost = Math.max(0, Number(item.inventoryItem?.cost || 0)); // Ensure cost is not negative
      const itemValue = cost * quantity;

      if (!storeValues[storeId]) {
        storeValues[storeId] = {
          name: storeName,
          totalValue: 0,
          itemCount: 0
        };
      }

      storeValues[storeId].totalValue += itemValue;
      storeValues[storeId].itemCount += quantity;
    });

    return Object.values(storeValues).sort((a, b) => b.totalValue - a.totalValue);
  }, [allStoreInventory]);

  // Check if any data is loading
  // Loading and error states are now handled by the useReportsData hook

  if (isLoading) {
    return (
      <Layout>
        <PageLoader />
      </Layout>
    );
  }

  // Error handling is now managed by the useReportsData hook

  return (
    <Layout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Reports</h1>
            <p className="text-muted-foreground mt-2">Analytics and insights for your inventory</p>
          </div>
          <button 
            onClick={() => setIsExportModalOpen(true)}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
                          Export Report
          </button>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <div className="p-6">
              <p className="text-sm font-medium text-muted-foreground">Total Inventory Value</p>
              <p className="text-2xl font-bold text-foreground">${reportData.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
          </Card>

          <Card>
            <div className="p-6">
              <p className="text-sm font-medium text-muted-foreground">Total Items</p>
              <p className="text-2xl font-bold text-foreground">{reportData.totalItems}</p>
            </div>
          </Card>
        </div>

        {/* Report Selection */}
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Select Report Type</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4">
              <button 
                onClick={() => setSelectedReport('summary')}
                className={`p-4 text-left border rounded-lg transition-colors ${
                  selectedReport === 'summary' 
                    ? 'border-primary bg-primary/10' 
                    : 'border-border hover:border-primary hover:bg-accent'
                }`}
              >
                <div>
                  <p className="font-medium text-foreground">Inventory Summary</p>
                  <p className="text-sm text-muted-foreground">Overview of all items</p>
                </div>
              </button>

              <button 
                onClick={() => setSelectedReport('value')}
                className={`p-4 text-left border rounded-lg transition-colors ${
                  selectedReport === 'value' 
                    ? 'border-primary bg-primary/10' 
                    : 'border-border hover:border-primary hover:bg-accent'
                }`}
              >
                <div>
                  <p className="font-medium text-foreground">Value Report</p>
                  <p className="text-sm text-muted-foreground">Total inventory value</p>
                </div>
              </button>

              <button 
                onClick={() => setSelectedReport('sales')}
                className={`p-4 text-left border rounded-lg transition-colors ${
                  selectedReport === 'sales' 
                    ? 'border-primary bg-primary/10' 
                    : 'border-border hover:border-primary hover:bg-accent'
                }`}
              >
                <div>
                  <p className="font-medium text-foreground">Sales by Store</p>
                  <p className="text-sm text-muted-foreground">Revenue based on sold items</p>
                </div>
              </button>

              <button 
                onClick={() => setSelectedReport('trends')}
                className={`p-4 text-left border rounded-lg transition-colors ${
                  selectedReport === 'trends' 
                    ? 'border-primary bg-primary/10' 
                    : 'border-border hover:border-primary hover:bg-accent'
                }`}
              >
                <div>
                  <p className="font-medium text-foreground">Trends Analysis</p>
                  <p className="text-sm text-muted-foreground">Sales and stock trends</p>
                </div>
              </button>

              <button 
                onClick={() => setSelectedReport('monthly')}
                className={`p-4 text-left border rounded-lg transition-colors ${
                  selectedReport === 'monthly' 
                    ? 'border-primary bg-primary/10' 
                    : 'border-border hover:border-primary hover:bg-accent'
                }`}
              >
                <div>
                  <p className="font-medium text-foreground">Monthly Report</p>
                  <p className="text-sm text-muted-foreground">This month's sales & profit</p>
                </div>
              </button>

              <button 
                onClick={() => setSelectedReport('annual')}
                className={`p-4 text-left border rounded-lg transition-colors ${
                  selectedReport === 'annual' 
                    ? 'border-primary bg-primary/10' 
                    : 'border-border hover:border-primary hover:bg-accent'
                }`}
              >
                <div>
                  <p className="font-medium text-foreground">Annual Report</p>
                  <p className="text-sm text-muted-foreground">This year's sales & profit</p>
                </div>
              </button>

              <button 
                onClick={() => setSelectedReport('store-value')}
                className={`p-4 text-left border rounded-lg transition-colors ${
                  selectedReport === 'store-value' 
                    ? 'border-primary bg-primary/10' 
                    : 'border-border hover:border-primary hover:bg-accent'
                }`}
              >
                <div>
                  <p className="font-medium text-foreground">Store Investment</p>
                  <p className="text-sm text-muted-foreground">Total value per store</p>
                </div>
              </button>
            </div>
          </div>
        </Card>



        {/* Inventory Summary Filters */}
        {selectedReport === 'summary' && (
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Inventory Summary - Filters</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Date Range</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      value={inventoryStartDate}
                      onChange={(e) => setInventoryStartDate(e.target.value)}
                      className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Start Date"
                    />
                    <input
                      type="date"
                      value={inventoryEndDate}
                      onChange={(e) => setInventoryEndDate(e.target.value)}
                      className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="End Date"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Store</label>
                  <select
                    value={selectedInventoryStore}
                    onChange={(e) => setSelectedInventoryStore(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="all">All Stores</option>
                    {storesData.map((store) => (
                      <option key={store.id} value={store.id}>
                        {store.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end space-x-2">
                  <button
                    onClick={handleApplyInventoryFilters}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Apply Filters
                  </button>
                  <button
                    onClick={() => {
                      setSelectedInventoryStore('all');
                      setInventoryStartDate('');
                      setInventoryEndDate('');
                    }}
                    className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    Clear Filters
                  </button>
                </div>
              </div>
              {filteredInventoryData.length > 0 && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-800">
                    Showing {filteredInventoryData.length} inventory items
                    {inventoryStartDate && inventoryEndDate && ` from ${inventoryStartDate} to ${inventoryEndDate}`}
                    {selectedInventoryStore !== 'all' && ` for ${storesData.find(s => s.id === selectedInventoryStore)?.name}`}
                  </p>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Value Report Filters */}
        {selectedReport === 'value' && (
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Value Report - Filters</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Date Range</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      value={valueStartDate}
                      onChange={(e) => setValueStartDate(e.target.value)}
                      className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Start Date"
                    />
                    <input
                      type="date"
                      value={valueEndDate}
                      onChange={(e) => setValueEndDate(e.target.value)}
                      className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="End Date"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Store</label>
                  <select
                    value={selectedValueStore}
                    onChange={(e) => setSelectedValueStore(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="all">All Stores</option>
                    {storesData.map((store) => (
                      <option key={store.id} value={store.id}>
                        {store.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end space-x-2">
                  <button
                    onClick={handleApplyValueFilters}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Apply Filters
                  </button>
                  <button
                    onClick={() => {
                      setSelectedValueStore('all');
                      setValueStartDate('');
                      setValueEndDate('');
                    }}
                    className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    Clear Filters
                  </button>
                </div>
              </div>
              {filteredValueInventoryData.length > 0 && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-800">
                    Showing {filteredValueInventoryData.length} inventory items
                    {valueStartDate && valueEndDate && ` from ${valueStartDate} to ${valueEndDate}`}
                    {selectedValueStore !== 'all' && ` for ${storesData.find(s => s.id === selectedValueStore)?.name}`}
                  </p>
                </div>
              )}
            </div>
          </Card>
        )}

        {selectedReport === 'monthly' && (
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Monthly Report</h3>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Sales</p>
                  <p className="text-2xl font-bold text-foreground">${monthlySummary.totalSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Profit</p>
                  <p className="text-2xl font-bold text-foreground">${monthlySummary.totalProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Items Sold</p>
                  <p className="text-2xl font-bold text-foreground">{monthlySummary.totalItems}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Completed Sales</p>
                  <p className="text-2xl font-bold text-green-600">{monthlySummary.completedSales}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Refunded Sales</p>
                  <p className="text-2xl font-bold text-orange-600">{monthlySummary.refundedSales}</p>
                </div>
              </div>
            </div>
          </Card>
        )}

        {selectedReport === 'annual' && (
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Annual Report</h3>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Sales</p>
                  <p className="text-2xl font-bold text-foreground">${annualSummary.totalSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Profit</p>
                  <p className="text-2xl font-bold text-foreground">${annualSummary.totalProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Items Sold</p>
                  <p className="text-2xl font-bold text-foreground">{annualSummary.totalItems}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Completed Sales</p>
                  <p className="text-2xl font-bold text-green-600">{annualSummary.completedSales}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Refunded Sales</p>
                  <p className="text-2xl font-bold text-orange-600">{annualSummary.refundedSales}</p>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Chart Display */}
        {selectedReport === 'summary' && filteredInventoryData && (
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">
                Inventory Summary
                {selectedInventoryStore !== 'all' && ` - ${storesData.find(s => s.id === selectedInventoryStore)?.name}`}
                {selectedInventoryStore === 'all' && ' - All Stores'}
              </h3>
              <InventorySummaryChart inventory={filteredInventoryData} />
            </div>
          </Card>
        )}

        {selectedReport === 'value' && filteredValueInventoryData && (
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">
                Value Report
                {selectedValueStore !== 'all' && ` - ${storesData.find(s => s.id === selectedValueStore)?.name}`}
                {selectedValueStore === 'all' && ' - All Stores'}
              </h3>
              <ValueReportChart inventory={filteredValueInventoryData} />
            </div>
          </Card>
        )}

        {selectedReport === 'summary' && filteredInventoryData.length === 0 && (
          <Card>
            <div className="p-6">
              <div className="text-center py-8">
                <p className="text-lg text-muted-foreground">No inventory data found for the selected store</p>
                <p className="text-sm text-muted-foreground mt-2">Try selecting a different store or check if the store has inventory</p>
              </div>
            </div>
          </Card>
        )}

        {selectedReport === 'value' && filteredValueInventoryData.length === 0 && (
          <Card>
            <div className="p-6">
              <div className="text-center py-8">
                <p className="text-lg text-muted-foreground">No inventory data found for the selected store</p>
                <p className="text-sm text-muted-foreground mt-2">Try selecting a different store or check if the store has inventory</p>
              </div>
            </div>
          </Card>
        )}

        {selectedReport === 'sales' && (
          <SalesByStoreReport />
        )}

        {selectedReport === 'trends' && salesData.length > 0 && transactions && (
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Trends Analysis</h3>
              <TrendsAnalysisChart sales={salesData} transactions={transactions} />
            </div>
          </Card>
        )}

        {selectedReport === 'store-value' && storeValueData.length > 0 && (
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Store Investment Monitoring</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {storeValueData.map((store, index) => (
                    <div key={index} className="p-4 border border-border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-foreground">{store.name}</h4>
                        <span className="text-sm text-muted-foreground">#{index + 1}</span>
                      </div>
                      <div className="space-y-2">
                        <div>
                          <p className="text-sm text-muted-foreground">Total Value</p>
                          <p className="text-xl font-bold text-foreground">
                            ${store.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Items in Stock</p>
                          <p className="text-lg font-semibold text-foreground">{store.itemCount}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-6 p-4 bg-muted rounded-lg">
                  <h4 className="font-medium text-foreground mb-2">Investment Summary</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Investment Across All Stores</p>
                      <p className="text-xl font-bold text-foreground">
                        ${storeValueData.reduce((sum, store) => sum + store.totalValue, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Average Value Per Store</p>
                      <p className="text-xl font-bold text-foreground">
                        ${(storeValueData.reduce((sum, store) => sum + store.totalValue, 0) / storeValueData.length).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        )}

        {selectedReport === 'store-value' && storeValueData.length === 0 && (
          <Card>
            <div className="p-6">
              <div className="text-center py-8">
                <p className="text-lg text-muted-foreground">No store inventory data found</p>
                <p className="text-sm text-muted-foreground mt-2">Add inventory to stores to see investment values</p>
              </div>
            </div>
          </Card>
        )}

        {/* Export Modal */}
        <ExportReportsModal 
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
        />
      </div>
    </Layout>
  );
} 
