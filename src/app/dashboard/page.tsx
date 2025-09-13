'use client';

import { useMemo, useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { Card } from '@/components/Card';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useReportsAPI } from '@/hooks/useReportsAPI';
import { useInventory } from '@/hooks';
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
  // State for date range filtering
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  
  // Convert month/year to date range
  const getDateRange = (year: number, month: number) => {
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0); // Last day of the month
    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    };
  };

  const currentDateRange = getDateRange(selectedYear, selectedMonth);
  
  // Get year data (entire year)
  const yearDateRange = {
    startDate: new Date(selectedYear, 0, 1).toISOString().split('T')[0],
    endDate: new Date(selectedYear, 11, 31).toISOString().split('T')[0]
  };

  // Use reports API for sales data fetching (month data)
  const { data: reportsData, isLoading: salesLoading, error: salesError } = useReportsAPI({
    type: 'sales',
    store: 'all',
    startDate: currentDateRange.startDate,
    endDate: currentDateRange.endDate,
    status: 'all',
    itemType: 'all'
  });

  // Get year data
  const { data: yearReportsData, isLoading: yearLoading, error: yearError } = useReportsAPI({
    type: 'sales',
    store: 'all',
    startDate: yearDateRange.startDate,
    endDate: yearDateRange.endDate,
    status: 'all',
    itemType: 'all'
  });

  // Get inventory data separately
  const { data: inventory, isLoading: inventoryLoading, isError: inventoryError } = useInventory();
  
  const isLoading = salesLoading || yearLoading || inventoryLoading;
  const error = salesError || yearError || inventoryError;

  // Get available years and months
  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const years = [];
    // Include current year and previous 5 years
    for (let i = 0; i < 6; i++) {
      years.push(currentYear - i);
    }
    return years;
  }, []);

  const availableMonths = useMemo(() => {
    // Always include all months (0-11 for January-December)
    const allMonths = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
    return allMonths;
  }, []);

  // Calculate stats from reports data
  const stats = useMemo<DashboardStats>(() => {
    if (isLoading || !reportsData?.data?.reportData) {
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

    const monthReportData = reportsData.data.reportData;
    const monthSalesData = monthReportData.sales || {};
    
    const yearReportData = yearReportsData?.data?.reportData;
    const yearSalesData = yearReportData?.sales || {};
    
    
    // Calculate inventory stats
    const activeInventory = inventory?.filter((item: any) => !item.deletedAt) || [];
    const totalInventory = activeInventory.length;
    const totalValue = activeInventory.reduce((sum: number, item: any) => {
      const cost = Math.max(0, Number(item.cost || 0));
      const quantity = Math.max(0, Number(item.quantity || 1));
      return sum + (cost * quantity);
    }, 0);
    
    // Month data
    const selectedMonthRevenue = monthSalesData.totalSales || 0;
    const selectedMonthSoldItems = monthSalesData.totalItems || 0;
    const selectedMonthNetProfit = monthSalesData.totalProfit || 0;
    const selectedMonthGrossProfit = monthSalesData.totalProfit || 0;
    const selectedMonthCompletedSales = monthSalesData.completedSales || 0;
    const selectedMonthRefundedSales = monthSalesData.refundedSales || 0;
    const selectedMonthRefundedAmount = monthSalesData.refundedAmount || 0;
    
    // Year data
    const totalRevenue = yearSalesData.totalSales || 0;
    const soldItems = yearSalesData.totalItems || 0;
    const selectedYearNetProfit = yearSalesData.totalProfit || 0;
    const selectedYearGrossProfit = yearSalesData.totalProfit || 0;
    const selectedYearCompletedSales = yearSalesData.completedSales || 0;
    const selectedYearRefundedSales = yearSalesData.refundedSales || 0;
    const selectedYearRefundedAmount = yearSalesData.refundedAmount || 0;

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
  }, [reportsData, yearReportsData, inventory, selectedYear, selectedMonth, isLoading]);

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

  if (error) {
    return (
      <ProtectedRoute>
        <Layout>
          <div className="space-y-6">
            <div className="p-6 bg-red-100 border border-red-300 rounded-lg">
              <h2 className="text-lg font-semibold text-red-800">Error Loading Dashboard</h2>
              <p className="text-red-700">{error}</p>
            </div>
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
          
        </div>
      </div>
      </Layout>
    </ProtectedRoute>
  );
} 
