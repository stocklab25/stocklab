'use client';

import { useMemo, useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { Card } from '@/components/Card';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useProducts, useInventory, useTransactions } from '@/hooks';
import { useAuth } from '@/contexts/AuthContext';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface DashboardStats {
  totalRevenue: number;
  totalInventory: number;
  totalValue: number;
  totalProfit: number;
}

export default function Dashboard() {
  const { data: products, isLoading: productsLoading } = useProducts();
  const { data: inventory, isLoading: inventoryLoading } = useInventory();
  const { data: transactions, isLoading: transactionsLoading } = useTransactions();
  const { getAuthToken } = useAuth();
  const [salesData, setSalesData] = useState<any[]>([]);

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
  }, [getAuthToken]);

  const stats = useMemo<DashboardStats>(() => {
    const totalValue = inventory.reduce((sum: number, item: any) => sum + Number(item.cost), 0);

    // Calculate total revenue and profit from sales
    const totalRevenue = salesData.reduce((sum: number, sale: any) => {
      const revenue = (sale.payout || 0) - (sale.discount || 0);
      return sum + revenue;
    }, 0);

    const totalProfit = salesData.reduce((sum: number, sale: any) => {
      const revenue = (sale.payout || 0) - (sale.discount || 0);
      const cost = (sale.cost || 0) * (sale.quantity || 1);
      return sum + (revenue - cost);
    }, 0);

    return {
      totalRevenue,
      totalInventory: inventory.length,
      totalValue,
      totalProfit,
    };
  }, [products, inventory, transactions, salesData]);

  // Process sales data for store chart
  const storeChartData = useMemo(() => {
    const storeSales = salesData.reduce((acc: { [key: string]: { revenue: number; profit: number; count: number } }, sale: any) => {
      const storeName = sale.store?.name || 'Unknown Store';
      const revenue = (sale.payout || 0) - (sale.discount || 0);
      const profit = revenue - ((sale.cost || 0) * (sale.quantity || 1));
      
      if (!acc[storeName]) {
        acc[storeName] = { revenue: 0, profit: 0, count: 0 };
      }
      
      acc[storeName].revenue += revenue;
      acc[storeName].profit += profit;
      acc[storeName].count += 1;
      
      return acc;
    }, {});

    const storeLabels = Object.keys(storeSales);
    const revenueData = Object.values(storeSales).map((store: any) => store.revenue);
    const profitData = Object.values(storeSales).map((store: any) => store.profit);

    return {
      labels: storeLabels,
      datasets: [
        {
          label: 'Revenue ($)',
          data: revenueData,
          backgroundColor: 'rgba(34, 197, 94, 0.8)',
          borderColor: 'rgba(34, 197, 94, 1)',
          borderWidth: 1,
        },
        {
          label: 'Profit ($)',
          data: profitData,
          backgroundColor: 'rgba(16, 185, 129, 0.8)',
          borderColor: 'rgba(16, 185, 129, 1)',
          borderWidth: 1,
        },
      ],
    };
  }, [salesData]);

  // Process sales data for product chart
  const productChartData = useMemo(() => {
    const productSales = salesData.reduce((acc: { [key: string]: { revenue: number; quantity: number; count: number } }, sale: any) => {
      const productName = sale.inventoryItem?.product?.name || 'Unknown Product';
      const revenue = (sale.payout || 0) - (sale.discount || 0);
      const quantity = sale.quantity || 1;
      
      if (!acc[productName]) {
        acc[productName] = { revenue: 0, quantity: 0, count: 0 };
      }
      
      acc[productName].revenue += revenue;
      acc[productName].quantity += quantity;
      acc[productName].count += 1;
      
      return acc;
    }, {});

    // Sort by revenue and take top 10
    const sortedProducts = Object.entries(productSales)
      .sort(([, a], [, b]) => b.revenue - a.revenue)
      .slice(0, 10);

    const productLabels = sortedProducts.map(([name]) => name);
    const revenueData = sortedProducts.map(([, data]) => data.revenue);
    const quantityData = sortedProducts.map(([, data]) => data.quantity);

    return {
      labels: productLabels,
      datasets: [
        {
          label: 'Revenue ($)',
          data: revenueData,
          backgroundColor: 'rgba(59, 130, 246, 0.8)',
          borderColor: 'rgba(59, 130, 246, 1)',
          borderWidth: 1,
        },
        {
          label: 'Quantity Sold',
          data: quantityData,
          backgroundColor: 'rgba(168, 85, 247, 0.8)',
          borderColor: 'rgba(168, 85, 247, 1)',
          borderWidth: 1,
        },
      ],
    };
  }, [salesData]);

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Store Sales Performance',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value: any) {
            return '$' + value.toLocaleString();
          },
        },
      },
    },
  };

  const productChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Top Products by Sales',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value: any) {
            return '$' + value.toLocaleString();
          },
        },
      },
    },
  };

  const isLoading = productsLoading || inventoryLoading || transactionsLoading;

  if (isLoading) {
    return (
      <ProtectedRoute>
        <Layout>
          <div className="flex items-center justify-center h-64">
            <div className="text-lg text-muted-foreground">Loading dashboard...</div>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <Layout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-2">Overview of your Stock Lab inventory system</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-lg">
                <span className="text-2xl">💰</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold text-foreground">${stats.totalRevenue.toLocaleString()}</p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-lg">
                <span className="text-2xl">📦</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Inventory Items</p>
                <p className="text-2xl font-bold text-foreground">{stats.totalInventory}</p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <span className="text-2xl">💎</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total Value</p>
                <p className="text-2xl font-bold text-foreground">${stats.totalValue.toLocaleString()}</p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center">
              <div className="p-3 bg-emerald-100 rounded-lg">
                <span className="text-2xl">📈</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total Profit</p>
                <p className="text-2xl font-bold text-foreground">${stats.totalProfit.toLocaleString()}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Store Sales Chart */}
          {salesData.length > 0 && (
            <Card>
              <div className="p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">Store Sales Performance</h3>
                <div className="h-80">
                  <Bar data={storeChartData} options={chartOptions} />
                </div>
              </div>
            </Card>
          )}

          {/* Product Sales Chart */}
          {salesData.length > 0 && (
            <Card>
              <div className="p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">Top Products by Sales</h3>
                <div className="h-80">
                  <Bar data={productChartData} options={productChartOptions} />
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
      </Layout>
    </ProtectedRoute>
  );
} 
