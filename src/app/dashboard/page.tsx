'use client';

import { useMemo, useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { Card } from '@/components/Card';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useProducts, useInventory, useTransactions, useSales } from '@/hooks';
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
  totalMonthlyGrossProfit: number;
  soldItems: number;
}

export default function Dashboard() {
  const { data: products, isLoading: productsLoading } = useProducts();
  const { data: inventory, isLoading: inventoryLoading } = useInventory();
  const { data: transactions, isLoading: transactionsLoading } = useTransactions();
  const { data: salesData, isLoading: salesLoading } = useSales();

  const stats = useMemo<DashboardStats>(() => {
    const totalValue = inventory.reduce((sum: number, item: any) => sum + Number(item.cost), 0);

    // Calculate total revenue and profit from sales
    const totalRevenue = salesData.reduce((sum: number, sale: any) => {
      const revenue = (sale.payout || 0) - (sale.discount || 0);
      return sum + revenue;
    }, 0);

    // Annual and monthly gross profit
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    let totalAnnualGrossProfit = 0;
    let totalMonthlyGrossProfit = 0;
    let soldItems = 0;
    salesData.forEach((sale: any) => {
      const saleDate = sale.createdAt ? new Date(sale.createdAt) : null;
      const revenue = (sale.payout || 0) - (sale.discount || 0);
      const cost = (sale.cost || 0) * (sale.quantity || 1);
      const profit = revenue - cost;
      if (saleDate && saleDate.getFullYear() === currentYear) {
        totalAnnualGrossProfit += profit;
        if (saleDate.getMonth() === currentMonth) {
          totalMonthlyGrossProfit += profit;
        }
      }
      soldItems += sale.quantity || 1;
    });

    return {
      totalRevenue,
      totalInventory: inventory.length,
      totalValue,
      totalProfit: totalAnnualGrossProfit,
      totalMonthlyGrossProfit,
      soldItems,
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

  const isLoading = productsLoading || inventoryLoading || transactionsLoading || salesLoading;

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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <Card>
            <div className="flex flex-col items-center p-8">
              <p className="text-lg font-medium text-muted-foreground">Total Revenue</p>
              <p className="text-3xl font-bold text-foreground">${stats.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
          </Card>
          <Card>
            <div className="flex flex-col items-center p-8">
              <p className="text-lg font-medium text-muted-foreground">Inventory Items</p>
              <p className="text-3xl font-bold text-foreground">{stats.totalInventory}</p>
            </div>
          </Card>
          <Card>
            <div className="flex flex-col items-center p-8">
              <p className="text-lg font-medium text-muted-foreground">Total Cost</p>
              <p className="text-3xl font-bold text-foreground">${stats.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
          </Card>
          <Card>
            <div className="flex flex-col items-center p-8">
              <p className="text-lg font-medium text-muted-foreground">Total Annual Gross Profit</p>
              <p className="text-3xl font-bold text-foreground">${stats.totalProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
          </Card>
          <Card>
            <div className="flex flex-col items-center p-8">
              <p className="text-lg font-medium text-muted-foreground">Total Monthly Gross Profit</p>
              <p className="text-3xl font-bold text-foreground">${stats.totalMonthlyGrossProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
          </Card>
          <Card>
            <div className="flex flex-col items-center p-8">
              <p className="text-lg font-medium text-muted-foreground">Sold Items</p>
              <p className="text-3xl font-bold text-foreground">{stats.soldItems}</p>
            </div>
          </Card>
        </div>
      </div>
      </Layout>
    </ProtectedRoute>
  );
} 
