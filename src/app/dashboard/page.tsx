'use client';

import { useMemo, useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { Card } from '@/components/Card';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useDashboardData } from '@/hooks';
import { useAuth } from '@/contexts/AuthContext';


interface DashboardStats {
  totalRevenue: number;
  totalInventory: number;
  totalValue: number;
  soldItems: number;
  selectedYearNetProfit: number;
  selectedMonthNetProfit: number;
  selectedYearGrossProfit: number;
  selectedMonthGrossProfit: number;
  selectedMonthRevenue: number;
  selectedMonthSoldItems: number;
  selectedYearRefundedAmount: number;
  selectedMonthRefundedAmount: number;
  selectedYearCompletedSales: number;
  selectedMonthCompletedSales: number;
  selectedYearRefundedSales: number;
  selectedMonthRefundedSales: number;
}

export default function Dashboard() {
  
  const { 
    products, 
    inventory, 
    transactions, 
    salesData, 
    expensesData, 
    isLoading,
    hasError,
    errorStates
  } = useDashboardData();


  // State for year and month selection
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());

  // Get available years and months from sales data
  const availableYears = useMemo(() => {
    // Always include current year
    const currentYear = new Date().getFullYear();
    const defaultYears = [currentYear];
    
    // Also include any years from sales data
    const years = new Set<number>(defaultYears);
    salesData.forEach((sale: any) => {
      if (sale.saleDate) {
        years.add(new Date(sale.saleDate).getFullYear());
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
    // Return default values if still loading
    if (isLoading) {
      return {
        totalRevenue: 0,
        totalInventory: 0,
        totalValue: 0,
        soldItems: 0,
        selectedYearNetProfit: 0,
        selectedMonthNetProfit: 0,
        selectedYearGrossProfit: 0,
        selectedMonthGrossProfit: 0,
        selectedMonthRevenue: 0,
        selectedMonthSoldItems: 0,
        selectedYearRefundedAmount: 0,
        selectedMonthRefundedAmount: 0,
        selectedYearCompletedSales: 0,
        selectedMonthCompletedSales: 0,
        selectedYearRefundedSales: 0,
        selectedMonthRefundedSales: 0,
      };
    }

    // Calculate stats based on selected year/month
    let totalRevenue = 0;
    let totalInventory = 0;
    let totalValue = 0;
    let selectedYearNetProfit = 0;
    let selectedMonthNetProfit = 0;
    let selectedYearGrossProfit = 0;
    let selectedMonthGrossProfit = 0;
    let soldItems = 0;
    let selectedMonthRevenue = 0;
    let selectedMonthSoldItems = 0;
    let selectedYearRefundedAmount = 0;
    let selectedMonthRefundedAmount = 0;
    let selectedYearCompletedSales = 0;
    let selectedMonthCompletedSales = 0;
    let selectedYearRefundedSales = 0;
    let selectedMonthRefundedSales = 0;
    
    // Calculate revenue and gross profit from sales for selected period
    salesData.forEach((sale: any) => {
      const saleDate = sale.saleDate ? new Date(sale.saleDate) : null;
      const revenue = Number(sale.payout || 0) - Number(sale.discount || 0);
      const cost = Number(sale.cost || 0) * Number(sale.quantity || 1);
      const grossProfit = revenue - cost; // Payout - Cost = Profit
      
      if (saleDate) {
        // Selected year calculations
        if (saleDate.getFullYear() === selectedYear) {
          if (sale.status === 'COMPLETED') {
            totalRevenue += revenue;
            selectedYearGrossProfit += grossProfit;
            selectedYearNetProfit += grossProfit;
            soldItems += sale.quantity || 1;
            selectedYearCompletedSales += 1;
            
            // Selected month calculations
            if (saleDate.getMonth() === selectedMonth) {
              selectedMonthGrossProfit += grossProfit;
              selectedMonthNetProfit += grossProfit;
              selectedMonthRevenue += revenue;
              selectedMonthSoldItems += sale.quantity || 1;
              selectedMonthCompletedSales += 1;
            }
          } else if (sale.status === 'REFUNDED') {
            selectedYearRefundedAmount += revenue;
            selectedYearRefundedSales += 1;
            
            // Selected month calculations
            if (saleDate.getMonth() === selectedMonth) {
              selectedMonthRefundedAmount += revenue;
              selectedMonthRefundedSales += 1;
            }
          }
        }
      }
    });

    // Calculate inventory stats for selected period
    // For inventory, we'll show current inventory value (not filtered by date since inventory is current state)
    // Filter out deleted items as extra safety
    const activeInventory = inventory.filter((item: any) => !item.deletedAt);
    totalValue = activeInventory.reduce((sum: number, item: any) => {
      const cost = Math.max(0, Number(item.cost || 0));
      const quantity = Math.max(0, Number(item.quantity || 1));
      return sum + (cost * quantity);
    }, 0);
    totalInventory = activeInventory.length;



    // Calculate expenses for selected year and month
    const selectedYearExpenses = expensesData.reduce((sum: number, expense: any) => {
      const expenseDate = expense.transactionDate ? new Date(expense.transactionDate) : null;
      if (expenseDate && expenseDate.getFullYear() === selectedYear) {
        return sum + (expense.amount || 0);
      }
      return sum;
    }, 0);

    const selectedMonthExpenses = expensesData.reduce((sum: number, expense: any) => {
      const expenseDate = expense.transactionDate ? new Date(expense.transactionDate) : null;
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
      soldItems,
      selectedYearNetProfit,
      selectedMonthNetProfit,
      selectedYearGrossProfit,
      selectedMonthGrossProfit,
      selectedMonthRevenue,
      selectedMonthSoldItems,
      selectedYearRefundedAmount,
      selectedMonthRefundedAmount,
      selectedYearCompletedSales,
      selectedMonthCompletedSales,
      selectedYearRefundedSales,
      selectedMonthRefundedSales,
    };
  }, [products, inventory, transactions, salesData, expensesData, selectedYear, selectedMonth]);

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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Row 1: Sold Items */}
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
          
          {/* Row 5: Sales Status */}
          <Card>
            <div className="flex flex-col items-center p-8">
              <p className="text-lg font-medium text-muted-foreground">{selectedYear} Completed Sales</p>
              <p className="text-3xl font-bold text-green-600">{stats.selectedYearCompletedSales}</p>
              <p className="text-sm text-muted-foreground mt-1">{stats.selectedYearRefundedSales} refunded</p>
            </div>
          </Card>
          <Card>
            <div className="flex flex-col items-center p-8">
              <p className="text-lg font-medium text-muted-foreground">{monthNames[selectedMonth]} {selectedYear} Completed Sales</p>
              <p className="text-3xl font-bold text-green-600">{stats.selectedMonthCompletedSales}</p>
              <p className="text-sm text-muted-foreground mt-1">{stats.selectedMonthRefundedSales} refunded</p>
            </div>
          </Card>
          
          {/* Row 6: Refunded Amounts */}
          <Card>
            <div className="flex flex-col items-center p-8">
              <p className="text-lg font-medium text-muted-foreground">{selectedYear} Refunded Amount</p>
              <p className="text-3xl font-bold text-red-600">${stats.selectedYearRefundedAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
          </Card>
          <Card>
            <div className="flex flex-col items-center p-8">
              <p className="text-lg font-medium text-muted-foreground">{monthNames[selectedMonth]} {selectedYear} Refunded Amount</p>
              <p className="text-3xl font-bold text-red-600">${stats.selectedMonthRefundedAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
          </Card>
        </div>
      </div>
      </Layout>
    </ProtectedRoute>
  );
} 
