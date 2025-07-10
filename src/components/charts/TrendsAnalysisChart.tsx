'use client';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface Sale {
  id: string;
  quantity: number;
  cost: number;
  payout: number;
  discount?: number;
  saleDate: string;
  store?: {
    name: string;
  };
}

interface Transaction {
  id: string;
  type: string;
  quantity: number;
  date: string;
}

interface TrendsAnalysisChartProps {
  sales: Sale[];
  transactions: Transaction[];
}

export default function TrendsAnalysisChart({ sales, transactions }: TrendsAnalysisChartProps) {
  // Process sales data by month
  const salesByMonth = sales.reduce((acc: { [key: string]: { revenue: number; quantity: number; count: number } }, sale) => {
    const date = new Date(sale.saleDate);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const revenue = (sale.payout || 0) - (sale.discount || 0);
    
    if (!acc[monthKey]) {
      acc[monthKey] = { revenue: 0, quantity: 0, count: 0 };
    }
    
    acc[monthKey].revenue += revenue;
    acc[monthKey].quantity += sale.quantity || 1;
    acc[monthKey].count += 1;
    
    return acc;
  }, {});

  // Process transaction data by month and type
  const transactionsByMonth = transactions.reduce((acc: { [key: string]: { [type: string]: number } }, txn) => {
    const date = new Date(txn.date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    if (!acc[monthKey]) {
      acc[monthKey] = {};
    }
    
    if (!acc[monthKey][txn.type]) {
      acc[monthKey][txn.type] = 0;
    }
    
    acc[monthKey][txn.type] += txn.quantity || 1;
    
    return acc;
  }, {});

  // Get all unique months and sort them
  const allMonths = [...new Set([...Object.keys(salesByMonth), ...Object.keys(transactionsByMonth)])].sort();

  const monthLabels = allMonths.map(month => {
    const [year, monthNum] = month.split('-');
    const date = new Date(parseInt(year), parseInt(monthNum) - 1);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  });

  const revenueData = allMonths.map(month => salesByMonth[month]?.revenue || 0);
  const salesCountData = allMonths.map(month => salesByMonth[month]?.count || 0);

  // Get all unique transaction types
  const allTransactionTypes = [...new Set(transactions.map(txn => txn.type))].sort();

  // Create datasets for each transaction type
  const transactionDatasets = allTransactionTypes.map((type, index) => {
    const colors = [
      'rgba(75, 192, 192, 0.8)',
      'rgba(255, 99, 132, 0.8)',
      'rgba(54, 162, 235, 0.8)',
      'rgba(255, 205, 86, 0.8)',
      'rgba(153, 102, 255, 0.8)',
      'rgba(255, 159, 64, 0.8)',
      'rgba(199, 199, 199, 0.8)',
      'rgba(83, 102, 255, 0.8)',
    ];
    
    const borderColors = [
      'rgba(75, 192, 192, 1)',
      'rgba(255, 99, 132, 1)',
      'rgba(54, 162, 235, 1)',
      'rgba(255, 205, 86, 1)',
      'rgba(153, 102, 255, 1)',
      'rgba(255, 159, 64, 1)',
      'rgba(199, 199, 199, 1)',
      'rgba(83, 102, 255, 1)',
    ];

    const data = allMonths.map(month => transactionsByMonth[month]?.[type] || 0);

    return {
      label: type,
      data: data,
      backgroundColor: colors[index % colors.length],
      borderColor: borderColors[index % borderColors.length],
      borderWidth: 1,
    };
  });

  const revenueChartData = {
    labels: monthLabels,
    datasets: [
      {
        label: 'Monthly Revenue ($)',
        data: revenueData,
        borderColor: 'rgba(54, 162, 235, 1)',
        backgroundColor: 'rgba(54, 162, 235, 0.2)',
        tension: 0.4,
        fill: true,
      },
    ],
  };

  const salesCountChartData = {
    labels: monthLabels,
    datasets: [
      {
        label: 'Number of Sales',
        data: salesCountData,
        borderColor: 'rgba(255, 99, 132, 1)',
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        tension: 0.4,
        fill: true,
      },
    ],
  };

  const transactionChartData = {
    labels: monthLabels,
    datasets: transactionDatasets,
  };

  const lineOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Monthly Trends',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value: any, index: number, values: any[]) {
            if (index === 0) return '$' + value.toLocaleString();
            return value.toLocaleString();
          },
        },
      },
    },
  };

  const barOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Transaction Activity by Type',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  const totalRevenue = sales.reduce((sum, sale) => {
    return sum + ((sale.payout || 0) - (sale.discount || 0));
  }, 0);

  const avgMonthlyRevenue = allMonths.length > 0 ? totalRevenue / allMonths.length : 0;

  // Calculate transaction type statistics
  const transactionTypeStats = allTransactionTypes.map(type => {
    const totalQuantity = transactions
      .filter(txn => txn.type === type)
      .reduce((sum, txn) => sum + (txn.quantity || 1), 0);
    
    return {
      type,
      totalQuantity,
      count: transactions.filter(txn => txn.type === type).length,
    };
  });

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-r from-blue-500 to-cyan-600 text-white p-6 rounded-lg">
          <h3 className="text-xl font-bold mb-2">Total Revenue</h3>
          <p className="text-3xl font-bold">${totalRevenue.toLocaleString()}</p>
          <p className="text-blue-100">All time</p>
        </div>
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white p-6 rounded-lg">
          <h3 className="text-xl font-bold mb-2">Avg Monthly Revenue</h3>
          <p className="text-3xl font-bold">${avgMonthlyRevenue.toLocaleString()}</p>
          <p className="text-green-100">Per month</p>
        </div>
        <div className="bg-gradient-to-r from-purple-500 to-violet-600 text-white p-6 rounded-lg">
          <h3 className="text-xl font-bold mb-2">Analysis Period</h3>
          <p className="text-3xl font-bold">{allMonths.length}</p>
          <p className="text-purple-100">Months of data</p>
        </div>
      </div>

      {/* Transaction Type Summary */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-foreground mb-4">Transaction Type Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {transactionTypeStats.map((stat, index) => (
            <div key={stat.type} className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">{stat.type}</p>
                  <p className="text-sm text-muted-foreground">{stat.count} transactions</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-foreground">{stat.totalQuantity}</p>
                  <p className="text-xs text-muted-foreground">total quantity</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <Line data={revenueChartData} options={lineOptions} />
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <Line data={salesCountChartData} options={lineOptions} />
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow">
        <Bar data={transactionChartData} options={barOptions} />
      </div>
    </div>
  );
} 