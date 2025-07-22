'use client';

import { useMemo, useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { Card } from '@/components/Card';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useProducts, useInventory, useTransactions, useSales, useExpenses } from '@/hooks';
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
  selectedYearNetProfit: number;
  selectedMonthNetProfit: number;
  selectedYearGrossProfit: number;
  selectedMonthGrossProfit: number;
  selectedMonthRevenue: number;
  selectedMonthSoldItems: number;
}

export default function Dashboard() {
  const { data: products, isLoading: productsLoading } = useProducts();
  const { data: inventory, isLoading: inventoryLoading } = useInventory();
  const { data: transactions, isLoading: transactionsLoading } = useTransactions();
  const { data: salesData, isLoading: salesLoading } = useSales();
  const { data: expensesData, isLoading: expensesLoading } = useExpenses();

  // State for year and month selection
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());

  // Get available years and months from sales data
  const availableYears = useMemo(() => {
    // Always include 2023-2025
    const defaultYears = [2025, 2024, 2023];
    
    // Also include any years from sales data
    const years = new Set<number>(defaultYears);
    salesData.forEach((sale: any) => {
      if (sale.createdAt) {
        years.add(new Date(sale.createdAt).getFullYear());
      }
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [salesData]);

  const availableMonths = useMemo(() => {
    // Always include all months (0-11 for January-December)
    const allMonths = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
    return allMonths;
  }, []);

  const stats = useMemo<DashboardStats>(() => {
    // Calculate stats based on selected year/month
    let totalRevenue = 0;
    let totalInventory = 0;
    let totalValue = 0;
    let totalAnnualGrossProfit = 0;
    let totalMonthlyGrossProfit = 0;
    let selectedYearNetProfit = 0;
    let selectedMonthNetProfit = 0;
    let selectedYearGrossProfit = 0;
    let selectedMonthGrossProfit = 0;
    let soldItems = 0;
    let selectedMonthRevenue = 0;
    let selectedMonthSoldItems = 0;
    
    // Calculate revenue and gross profit from sales for selected period
    salesData.forEach((sale: any) => {
      const saleDate = sale.createdAt ? new Date(sale.createdAt) : null;
      const revenue = (sale.payout || 0) - (sale.discount || 0);
      const cost = (sale.cost || 0) * (sale.quantity || 1);
      const grossProfit = revenue - cost;
      
      if (saleDate) {
        // Selected year calculations
        if (saleDate.getFullYear() === selectedYear) {
          totalRevenue += revenue;
          selectedYearGrossProfit += grossProfit;
          selectedYearNetProfit += grossProfit;
          soldItems += sale.quantity || 1;
          
          // Selected month calculations
          if (saleDate.getMonth() === selectedMonth) {
            selectedMonthGrossProfit += grossProfit;
            selectedMonthNetProfit += grossProfit;
            selectedMonthRevenue += revenue;
            selectedMonthSoldItems += sale.quantity || 1;
          }
        }
      }
    });

    // Calculate inventory stats for selected period
    // For inventory, we'll show current inventory value (not filtered by date since inventory is current state)
    totalValue = inventory.reduce((sum: number, item: any) => sum + Number(item.cost), 0);
    totalInventory = inventory.length;

    // Calculate current year/month gross profit for comparison
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    
    salesData.forEach((sale: any) => {
      const saleDate = sale.createdAt ? new Date(sale.createdAt) : null;
      if (saleDate && saleDate.getFullYear() === currentYear) {
        const revenue = (sale.payout || 0) - (sale.discount || 0);
        const cost = (sale.cost || 0) * (sale.quantity || 1);
        const grossProfit = revenue - cost;
        totalAnnualGrossProfit += grossProfit;
        
        if (saleDate.getMonth() === currentMonth) {
          totalMonthlyGrossProfit += grossProfit;
        }
      }
    });

    // Calculate expenses for selected year and month
    const selectedYearExpenses = expensesData.reduce((sum: number, expense: any) => {
      const expenseDate = expense.date ? new Date(expense.date) : null;
      if (expenseDate && expenseDate.getFullYear() === selectedYear) {
        return sum + (expense.amount || 0);
      }
      return sum;
    }, 0);

    const selectedMonthExpenses = expensesData.reduce((sum: number, expense: any) => {
      const expenseDate = expense.date ? new Date(expense.date) : null;
      if (expenseDate && expenseDate.getFullYear() === selectedYear && expenseDate.getMonth() === selectedMonth) {
        return sum + (expense.amount || 0);
      }
      return sum;
    }, 0);

    // Calculate net profit (gross profit - expenses)
    selectedYearNetProfit -= selectedYearExpenses;
    selectedMonthNetProfit -= selectedMonthExpenses;

    return {
      totalRevenue,
      totalInventory,
      totalValue,
      totalProfit: totalAnnualGrossProfit,
      totalMonthlyGrossProfit,
      soldItems,
      selectedYearNetProfit,
      selectedMonthNetProfit,
      selectedYearGrossProfit,
      selectedMonthGrossProfit,
      selectedMonthRevenue,
      selectedMonthSoldItems,
    };
  }, [products, inventory, transactions, salesData, expensesData, selectedYear, selectedMonth]);

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

  const isLoading = productsLoading || inventoryLoading || transactionsLoading || salesLoading || expensesLoading;

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

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

        {/* Year and Month Selectors */}
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center space-x-2">
            <label className="text-lg font-medium text-foreground">Year:</label>
            <select
              value={selectedYear}
              onChange={(e) => {
                setSelectedYear(Number(e.target.value));
                setSelectedMonth(0); // Reset to January when year changes
              }}
              className="px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {availableYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
          
          <div className="flex items-center space-x-2">
            <label className="text-lg font-medium text-foreground">Month:</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {availableMonths.map((month) => (
                <option key={month} value={month}>
                  {monthNames[month]}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Row 1: Sold Items */}
          <Card>
            <div className="flex flex-col items-center p-8">
              <p className="text-lg font-medium text-muted-foreground">Current Year Sold Items</p>
              <p className="text-3xl font-bold text-foreground">{stats.totalInventory}</p>
            </div>
          </Card>
          <Card>
            <div className="flex flex-col items-center p-8">
              <p className="text-lg font-medium text-muted-foreground">{selectedYear} Sold Items</p>
              <p className="text-3xl font-bold text-foreground">{stats.soldItems}</p>
            </div>
          </Card>
          <Card>
            <div className="flex flex-col items-center p-8">
              <p className="text-lg font-medium text-muted-foreground">{monthNames[selectedMonth]} {selectedYear} Sold Items</p>
              <p className="text-3xl font-bold text-foreground">{stats.selectedMonthSoldItems}</p>
            </div>
          </Card>
          
          {/* Row 2: Revenue */}
          <Card>
            <div className="flex flex-col items-center p-8">
              <p className="text-lg font-medium text-muted-foreground">Current Year Revenue</p>
              <p className="text-3xl font-bold text-foreground">${stats.totalProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
          </Card>
          <Card>
            <div className="flex flex-col items-center p-8">
              <p className="text-lg font-medium text-muted-foreground">{selectedYear} Revenue</p>
              <p className="text-3xl font-bold text-foreground">${stats.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
          </Card>
          <Card>
            <div className="flex flex-col items-center p-8">
              <p className="text-lg font-medium text-muted-foreground">{monthNames[selectedMonth]} {selectedYear} Revenue</p>
              <p className="text-3xl font-bold text-foreground">${stats.selectedMonthRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
          </Card>
          
          {/* Row 3: Gross Profit */}
          <Card>
            <div className="flex flex-col items-center p-8">
              <p className="text-lg font-medium text-muted-foreground">Current Year Gross Profit</p>
              <p className="text-3xl font-bold text-foreground">${stats.totalProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
          </Card>
          <Card>
            <div className="flex flex-col items-center p-8">
              <p className="text-lg font-medium text-muted-foreground">{selectedYear} Gross Profit</p>
              <p className="text-3xl font-bold text-foreground">${stats.selectedYearGrossProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
          </Card>
          <Card>
            <div className="flex flex-col items-center p-8">
              <p className="text-lg font-medium text-muted-foreground">{monthNames[selectedMonth]} {selectedYear} Gross Profit</p>
              <p className="text-3xl font-bold text-foreground">${stats.selectedMonthGrossProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
          </Card>
          
          {/* Row 4: Net Profit */}
          <Card>
            <div className="flex flex-col items-center p-8">
              <p className="text-lg font-medium text-muted-foreground">Current Year Net Profit</p>
              <p className="text-3xl font-bold text-foreground">${stats.totalMonthlyGrossProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
          </Card>
          <Card>
            <div className="flex flex-col items-center p-8">
              <p className="text-lg font-medium text-muted-foreground">{selectedYear} Net Profit</p>
              <p className="text-3xl font-bold text-foreground">${stats.selectedYearNetProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
          </Card>
          <Card>
            <div className="flex flex-col items-center p-8">
              <p className="text-lg font-medium text-muted-foreground">{monthNames[selectedMonth]} {selectedYear} Net Profit</p>
              <p className="text-3xl font-bold text-foreground">${stats.selectedMonthNetProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
          </Card>
        </div>
      </div>
      </Layout>
    </ProtectedRoute>
  );
} 
