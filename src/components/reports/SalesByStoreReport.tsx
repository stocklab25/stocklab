'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/Card';
import { PageLoader } from '@/components/Loader';
import { useAuth } from '@/contexts/AuthContext';
import { useStores } from '@/hooks/useStores';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

interface StoreStats {
  storeId: string;
  storeName: string;
  totalRevenue: number;
  totalProfit: number;
  netProfit: number;
  profitMargin: number;
  totalItems: number;
  inStockCount: number;
  completedSales: number;
  refundedSales: number;
  refundedAmount: number;
  sales: any[];
}

interface OverallStats {
  totalRevenue: number;
  totalNetProfit: number;
  totalItems: number;
  totalInStockCount: number;
  totalCompletedSales: number;
  totalRefundedSales: number;
  totalRefundedAmount: number;
  activeStores: number;
  profitMargin: number;
}

interface SalesByStoreReportData {
  storeStats: StoreStats[];
  overallStats: OverallStats;
  totalSales: number;
  filters: {
    startDate: string | null;
    endDate: string | null;
    storeId: string | null;
    status: string | null;
  };
}

export default function SalesByStoreReport() {
  const { getAuthToken } = useAuth();
  const { data: stores, isLoading: storesLoading, isError: storesError } = useStores('ACTIVE');
  const [reportData, setReportData] = useState<SalesByStoreReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Stores data is now properly loaded via the useReportsData hook

  // Filter states
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedStore, setSelectedStore] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  
  // Applied filter states (what's actually being used for the API call)
  const [appliedStartDate, setAppliedStartDate] = useState<string>('');
  const [appliedEndDate, setAppliedEndDate] = useState<string>('');
  const [appliedStore, setAppliedStore] = useState<string>('all');
  const [appliedStatus, setAppliedStatus] = useState<string>('all');

  const handleApplyFilters = () => {
    setAppliedStartDate(startDate);
    setAppliedEndDate(endDate);
    setAppliedStore(selectedStore);
    setAppliedStatus(selectedStatus);
  };

  const fetchReportData = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = await getAuthToken();
      if (!token) {
        setError('Authentication required');
        return;
      }

      const params = new URLSearchParams();
      if (appliedStartDate) params.append('startDate', appliedStartDate);
      if (appliedEndDate) params.append('endDate', appliedEndDate);
      if (appliedStore !== 'all') params.append('storeId', appliedStore);
      if (appliedStatus !== 'all') params.append('status', appliedStatus);

      const response = await fetch(`/api/reports/sales-by-store?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch report data');
      }

      const data = await response.json();
      setReportData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, [appliedStartDate, appliedEndDate, appliedStore, appliedStatus]);

  const handleExport = async () => {
    try {
      const token = await getAuthToken();
      if (!token) return;

      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (selectedStore !== 'all') params.append('storeId', selectedStore);
      if (selectedStatus !== 'all') params.append('status', selectedStatus);

      const response = await fetch(`/api/reports/export/sales-by-store?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to export data');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sales-by-store-report-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  if (loading) {
    return <PageLoader />;
  }

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <div className="text-center text-red-600">
            <p>Error: {error}</p>
            <button
              onClick={fetchReportData}
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Retry
            </button>
          </div>
        </Card>
      </div>
    );
  }

  if (!reportData) {
    return (
      <div className="p-6">
        <Card>
          <div className="text-center text-gray-600">
            <p>No data available</p>
          </div>
        </Card>
      </div>
    );
  }

  const { storeStats, overallStats } = reportData;

  // Prepare chart data
  const storeLabels = storeStats.map(store => store.storeName);
  const revenueData = storeStats.map(store => store.totalRevenue);
  const profitData = storeStats.map(store => store.netProfit);
  const itemsData = storeStats.map(store => store.totalItems);
  const inStockData = storeStats.map(store => store.inStockCount);
  
  // Calculate total gross profit (before expenses)
  const totalGrossProfit = storeStats.reduce((sum, store) => sum + store.totalProfit, 0);

  const revenueChartData = {
    labels: storeLabels,
    datasets: [
      {
        label: 'Revenue ($)',
        data: revenueData,
        backgroundColor: 'rgba(54, 162, 235, 0.8)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1,
      },
    ],
  };

  const profitChartData = {
    labels: storeLabels,
    datasets: [
      {
        label: 'Net Profit ($)',
        data: profitData,
        backgroundColor: 'rgba(75, 192, 192, 0.8)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 1,
      },
    ],
  };

  const itemsChartData = {
    labels: storeLabels,
    datasets: [
      {
        label: 'Items Sold',
        data: itemsData,
        backgroundColor: 'rgba(255, 99, 132, 0.8)',
        borderColor: 'rgba(255, 99, 132, 1)',
        borderWidth: 1,
      },
    ],
  };

  const inStockChartData = {
    labels: storeLabels,
    datasets: [
      {
        label: 'In Stock Count',
        data: inStockData,
        backgroundColor: 'rgba(153, 102, 255, 0.8)',
        borderColor: 'rgba(153, 102, 255, 1)',
        borderWidth: 1,
      },
    ],
  };

  // Process sales data for line graphs (trends over time)
  const processSalesTrends = () => {
    const dateMap = new Map();
    const storeTrends = new Map();

    // Initialize store trends
    storeStats.forEach(store => {
      storeTrends.set(store.storeId, {
        name: store.storeName,
        dailyRevenue: new Map(),
        dailyItems: new Map(),
        dailyProfit: new Map()
      });
    });

    // Process all sales data
    storeStats.forEach(store => {
      store.sales.forEach(sale => {
        const saleDate = new Date(sale.saleDate).toISOString().split('T')[0];
        const storeTrend = storeTrends.get(store.storeId);
        
        if (!storeTrend.dailyRevenue.has(saleDate)) {
          storeTrend.dailyRevenue.set(saleDate, 0);
          storeTrend.dailyItems.set(saleDate, 0);
          storeTrend.dailyProfit.set(saleDate, 0);
        }

        if (sale.status === 'COMPLETED') {
          const revenue = (sale.payout || 0) - (sale.discount || 0);
          const profit = revenue - ((sale.cost || 0) * (sale.quantity || 1));
          
          storeTrend.dailyRevenue.set(saleDate, storeTrend.dailyRevenue.get(saleDate) + revenue);
          storeTrend.dailyItems.set(saleDate, storeTrend.dailyItems.get(saleDate) + (sale.quantity || 1));
          storeTrend.dailyProfit.set(saleDate, storeTrend.dailyProfit.get(saleDate) + profit);
        }
      });
    });

    // Get all unique dates and sort them
    const allDates = new Set();
    storeTrends.forEach(store => {
      store.dailyRevenue.forEach((_: any, date: any) => allDates.add(date));
    });
    const sortedDates = Array.from(allDates).sort();

    // Create datasets for line charts
    const revenueTrendDatasets = Array.from(storeTrends.values()).map((store, index) => {
      const colors = [
        'rgba(54, 162, 235, 1)',
        'rgba(255, 99, 132, 1)',
        'rgba(75, 192, 192, 1)',
        'rgba(153, 102, 255, 1)',
        'rgba(255, 205, 86, 1)',
        'rgba(255, 159, 64, 1)'
      ];
      
      return {
        label: store.name,
        data: sortedDates.map(date => store.dailyRevenue.get(date) || 0),
        borderColor: colors[index % colors.length],
        backgroundColor: colors[index % colors.length].replace('1)', '0.1)'),
        tension: 0.4,
        fill: false,
      };
    });

    const itemsTrendDatasets = Array.from(storeTrends.values()).map((store, index) => {
      const colors = [
        'rgba(54, 162, 235, 1)',
        'rgba(255, 99, 132, 1)',
        'rgba(75, 192, 192, 1)',
        'rgba(153, 102, 255, 1)',
        'rgba(255, 205, 86, 1)',
        'rgba(255, 159, 64, 1)'
      ];
      
      return {
        label: store.name,
        data: sortedDates.map(date => store.dailyItems.get(date) || 0),
        borderColor: colors[index % colors.length],
        backgroundColor: colors[index % colors.length].replace('1)', '0.1)'),
        tension: 0.4,
        fill: false,
      };
    });

    const profitTrendDatasets = Array.from(storeTrends.values()).map((store, index) => {
      const colors = [
        'rgba(54, 162, 235, 1)',
        'rgba(255, 99, 132, 1)',
        'rgba(75, 192, 192, 1)',
        'rgba(153, 102, 255, 1)',
        'rgba(255, 205, 86, 1)',
        'rgba(255, 159, 64, 1)'
      ];
      
      return {
        label: store.name,
        data: sortedDates.map(date => store.dailyProfit.get(date) || 0),
        borderColor: colors[index % colors.length],
        backgroundColor: colors[index % colors.length].replace('1)', '0.1)'),
        tension: 0.4,
        fill: false,
      };
    });

    return {
      labels: sortedDates,
      revenueTrendDatasets,
      itemsTrendDatasets,
      profitTrendDatasets
    };
  };

  const trendsData = processSalesTrends();

  const revenueTrendChartData = {
    labels: trendsData.labels,
    datasets: trendsData.revenueTrendDatasets,
  };

  const itemsTrendChartData = {
    labels: trendsData.labels,
    datasets: trendsData.itemsTrendDatasets,
  };

  const profitTrendChartData = {
    labels: trendsData.labels,
    datasets: trendsData.profitTrendDatasets,
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
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

  const itemsChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  const lineChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Date'
        }
      },
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Value'
        }
      },
    },
    interaction: {
      intersect: false,
      mode: 'index' as const,
    },
  };

  const lineChartOptionsItems = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Date'
        }
      },
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Items Sold'
        }
      },
    },
    interaction: {
      intersect: false,
      mode: 'index' as const,
    },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-foreground">Sales by Store Report</h2>
        <button
          onClick={handleExport}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">Filters</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Store
              </label>
                             <select
                 value={selectedStore}
                 onChange={(e) => setSelectedStore(e.target.value)}
                 className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                 disabled={storesLoading}
               >
                 <option value="all">All Stores</option>
                 {storesLoading ? (
                   <option disabled>Loading stores...</option>
                 ) : stores && stores.length > 0 ? (
                   stores.map((store) => (
                     <option key={store.id} value={store.id}>
                       {store.name}
                     </option>
                   ))
                 ) : (
                   <option disabled>No stores found</option>
                 )}
               </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Status
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Statuses</option>
                <option value="COMPLETED">Completed</option>
                <option value="REFUNDED">Refunded</option>
              </select>
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              onClick={handleApplyFilters}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Apply Filters
            </button>
          </div>
        </div>
      </Card>

             {/* Overall Summary */}
       <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold text-foreground">
                  ${overallStats.totalRevenue.toLocaleString()}
                </p>
              </div>
              <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Gross Profit</p>
                <p className="text-2xl font-bold text-foreground">
                  ${totalGrossProfit.toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground">
                  Before expenses
                </p>
              </div>
              <div className="h-12 w-12 bg-emerald-100 rounded-full flex items-center justify-center">
                <svg className="h-6 w-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Net Profit</p>
                <p className="text-2xl font-bold text-foreground">
                  ${overallStats.totalNetProfit.toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground">
                  {overallStats.profitMargin.toFixed(1)}% margin
                </p>
              </div>
              <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
            </div>
          </div>
        </Card>

                 <Card>
           <div className="p-6">
             <div className="flex items-center justify-between">
               <div>
                 <p className="text-sm font-medium text-muted-foreground">Items Sold</p>
                 <p className="text-2xl font-bold text-foreground">
                   {overallStats.totalItems.toLocaleString()}
                 </p>
                 <p className="text-sm text-muted-foreground">
                   {overallStats.totalCompletedSales} completed sales
                 </p>
               </div>
               <div className="h-12 w-12 bg-purple-100 rounded-full flex items-center justify-center">
                 <svg className="h-6 w-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                 </svg>
               </div>
             </div>
           </div>
         </Card>

         <Card>
           <div className="p-6">
             <div className="flex items-center justify-between">
               <div>
                 <p className="text-sm font-medium text-muted-foreground">In Stock Count</p>
                 <p className="text-2xl font-bold text-foreground">
                   {overallStats.totalInStockCount.toLocaleString()}
                 </p>
                 <p className="text-sm text-muted-foreground">
                   Current inventory across all stores
                 </p>
               </div>
               <div className="h-12 w-12 bg-indigo-100 rounded-full flex items-center justify-center">
                 <svg className="h-6 w-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                 </svg>
               </div>
             </div>
           </div>
         </Card>

      </div>

             {/* Charts */}
       <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Revenue by Store</h3>
            <Bar data={revenueChartData} options={chartOptions} />
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Net Profit by Store</h3>
            <Bar data={profitChartData} options={chartOptions} />
          </div>
        </Card>

                 <Card>
           <div className="p-6">
             <h3 className="text-lg font-semibold mb-4">Items Sold by Store</h3>
             <Bar data={itemsChartData} options={itemsChartOptions} />
           </div>
         </Card>

         <Card>
           <div className="p-6">
             <h3 className="text-lg font-semibold mb-4">In Stock Count by Store</h3>
             <Bar data={inStockChartData} options={itemsChartOptions} />
           </div>
         </Card>
       </div>

      {/* Line Charts - Sales Trends Over Time */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Revenue Trends Over Time</h3>
            <Line data={revenueTrendChartData} options={lineChartOptions} />
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Items Sold Trends Over Time</h3>
            <Line data={itemsTrendChartData} options={lineChartOptionsItems} />
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Profit Trends Over Time</h3>
            <Line data={profitTrendChartData} options={lineChartOptions} />
          </div>
        </Card>
      </div>

      {/* Store Performance Table */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">Store Performance Details</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Store
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Revenue
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Net Profit
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Margin
                  </th>
                                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                     Items Sold
                   </th>
                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                     In Stock Count
                   </th>
                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                     Sales
                   </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Refunds
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {storeStats.map((store) => (
                  <tr key={store.storeId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {store.storeName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${store.totalRevenue.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${store.netProfit.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {store.profitMargin.toFixed(1)}%
                    </td>
                                         <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                       {store.totalItems.toLocaleString()}
                     </td>
                     <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                       {store.inStockCount.toLocaleString()}
                     </td>
                     <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                       <div className="flex flex-col">
                         <span className="text-green-600">{store.completedSales} completed</span>
                         {store.refundedSales > 0 && (
                           <span className="text-red-600">{store.refundedSales} refunded</span>
                         )}
                       </div>
                     </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {store.refundedAmount > 0 ? `$${store.refundedAmount.toLocaleString()}` : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Card>
    </div>
  );
}
