'use client';

import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { Card } from '@/components/Card';
import { PageLoader } from '@/components/Loader';
import { useInventory, useProducts, useTransactions } from '@/hooks';
import { useSettings } from '@/contexts/SettingsContext';
import { useAuth } from '@/contexts/AuthContext';
import InventorySummaryChart from '@/components/charts/InventorySummaryChart';
import ValueReportChart from '@/components/charts/ValueReportChart';
import SalesByStoreChart from '@/components/charts/SalesByStoreChart';
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

export default function Reports() {
  const { getAuthToken } = useAuth();
  const { data: inventory, isLoading: inventoryLoading, isError: inventoryError } = useInventory();
  const { data: products, isLoading: productsLoading, isError: productsError } = useProducts();
  const { data: transactions, isLoading: transactionsLoading, isError: transactionsError } = useTransactions();
  const { settings } = useSettings();
  const [selectedReport, setSelectedReport] = useState<string>('summary');
  const [salesData, setSalesData] = useState<any[]>([]);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  
  const [reportData, setReportData] = useState<ReportData>({
    totalValue: 0,
    totalItems: 0,
    lowStockItems: 0,
    topBrands: [],
    recentActivity: [],
  });

  // Fetch sales data
  useEffect(() => {
    const fetchSales = async () => {
      try {
        const token = await getAuthToken();
        if (!token) {
          
          return;
        }

        const response = await fetch('/api/sales', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        if (response.ok) {
          const data = await response.json();
          setSalesData(Array.isArray(data) ? data : data?.data || []);
        }
      } catch (error) {
        
      }
    };
    fetchSales();
  }, []); // Removed getAuthToken from dependency array

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
          const itemValue = (item.cost || 0) * (item.quantity || 1);
          return sum + itemValue;
        }, 0);
        const totalItems = inventory.length;
        
        // Count items by brand
        const brandCounts: { [key: string]: number } = {};
        inventory.forEach((item: InventoryItem) => {
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

        // Calculate low stock items
        const lowStockItems = inventory.filter((item: InventoryItem) => 
          item.quantity <= settings.lowStockThreshold
        ).length;

        setReportData({
          totalValue,
          totalItems,
          lowStockItems,
          topBrands,
          recentActivity,
        });
      } catch (error) {
        
      }
    }
  }, [inventory?.length, products?.length, transactions?.length, settings.lowStockThreshold]);

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
    salesArr.forEach(sale => {
      const payout = Number(sale.payout) || 0;
      const discount = Number(sale.discount) || 0;
      const cost = Number(sale.cost) || 0;
      const quantity = Number(sale.quantity) || 1;
      totalSales += payout - discount;
      totalProfit += (payout - discount) - (cost * quantity);
      totalItems += quantity;
    });
    return {
      totalSales,
      totalProfit,
      totalItems,
    };
  };
  const monthlySummary = getSalesSummary(monthlySales);
  const annualSummary = getSalesSummary(annualSales);

  // Check if any data is loading
  const isLoading = inventoryLoading || productsLoading || transactionsLoading;
  
  // Check if any data has errors
  const hasError = inventoryError || productsError || transactionsError;

  if (isLoading) {
    return (
      <Layout>
        <PageLoader />
      </Layout>
    );
  }

  if (hasError) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center space-y-4">
                          <div className="text-6xl">!</div>
            <div className="text-lg text-red-600">Error loading reports</div>
            <p className="text-muted-foreground">Failed to fetch data. Please check your connection and try again.</p>
            <button 
              onClick={() => window.location.href = '/reports'}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </Layout>
    );
  }

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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

          <Card>
            <div className="p-6">
              <p className="text-sm font-medium text-gray-600">Low Stock Items</p>
              <p className="text-2xl font-bold text-gray-900">{reportData.lowStockItems}</p>
            </div>
          </Card>
        </div>

        {/* Report Selection */}
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Select Report Type</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
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
                  <p className="text-sm text-muted-foreground">Store performance</p>
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
            </div>
          </div>
        </Card>

        {selectedReport === 'monthly' && (
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Monthly Report</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
              </div>
            </div>
          </Card>
        )}

        {selectedReport === 'annual' && (
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Annual Report</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
              </div>
            </div>
          </Card>
        )}

        {/* Chart Display */}
        {selectedReport === 'summary' && inventory && (
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Inventory Summary</h3>
              <InventorySummaryChart inventory={inventory} />
            </div>
          </Card>
        )}

        {selectedReport === 'value' && inventory && (
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Value Report</h3>
              <ValueReportChart inventory={inventory} />
            </div>
          </Card>
        )}

        {selectedReport === 'sales' && salesData.length > 0 && (
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Sales by Store</h3>
              <SalesByStoreChart sales={salesData} />
            </div>
          </Card>
        )}

        {selectedReport === 'trends' && salesData.length > 0 && transactions && (
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Trends Analysis</h3>
              <TrendsAnalysisChart sales={salesData} transactions={transactions} />
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
