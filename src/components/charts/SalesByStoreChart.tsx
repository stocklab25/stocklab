'use client';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

interface Sale {
  id: string;
  orderNumber: string;
  storeId: string;
  quantity: number;
  cost: number;
  payout: number;
  discount?: number;
  saleDate: string;
  store?: {
    id: string;
    name: string;
  };
  inventoryItem?: {
    product?: {
      brand: string;
      name: string;
    };
  };
}

interface SalesByStoreChartProps {
  sales: Sale[];
}

export default function SalesByStoreChart({ sales }: SalesByStoreChartProps) {
  // Process data for store sales performance
  const storeSalesData = sales.reduce((acc: { [key: string]: { revenue: number; profit: number; quantity: number; count: number } }, sale) => {
    const storeName = sale.store?.name || 'Unknown Store';
    const revenue = (sale.payout || 0) - (sale.discount || 0);
    const profit = revenue - ((sale.cost || 0) * (sale.quantity || 1));
    
    if (!acc[storeName]) {
      acc[storeName] = { revenue: 0, profit: 0, quantity: 0, count: 0 };
    }
    
    acc[storeName].revenue += revenue;
    acc[storeName].profit += profit;
    acc[storeName].quantity += sale.quantity || 1;
    acc[storeName].count += 1;
    
    return acc;
  }, {});

  const storeLabels = Object.keys(storeSalesData);
  const storeRevenues = Object.values(storeSalesData).map(store => store.revenue);
  const storeProfits = Object.values(storeSalesData).map(store => store.profit);
  const storeQuantities = Object.values(storeSalesData).map(store => store.quantity);

  // Process data for brand sales distribution
  const brandSalesData = sales.reduce((acc: { [key: string]: { revenue: number; profit: number; quantity: number } }, sale) => {
    const brand = sale.inventoryItem?.product?.brand || 'Unknown Brand';
    const revenue = (sale.payout || 0) - (sale.discount || 0);
    const profit = revenue - ((sale.cost || 0) * (sale.quantity || 1));
    
    if (!acc[brand]) {
      acc[brand] = { revenue: 0, profit: 0, quantity: 0 };
    }
    
    acc[brand].revenue += revenue;
    acc[brand].profit += profit;
    acc[brand].quantity += sale.quantity || 1;
    
    return acc;
  }, {});

  const brandLabels = Object.keys(brandSalesData);
  const brandRevenues = Object.values(brandSalesData).map(brand => brand.revenue);
  const brandProfits = Object.values(brandSalesData).map(brand => brand.profit);

  // Process data for product sales
  const productSalesData = sales.reduce((acc: { [key: string]: { revenue: number; profit: number; quantity: number; count: number } }, sale) => {
    const productName = sale.inventoryItem?.product?.name || 'Unknown Product';
    const revenue = (sale.payout || 0) - (sale.discount || 0);
    const profit = revenue - ((sale.cost || 0) * (sale.quantity || 1));
    
    if (!acc[productName]) {
      acc[productName] = { revenue: 0, profit: 0, quantity: 0, count: 0 };
    }
    
    acc[productName].revenue += revenue;
    acc[productName].profit += profit;
    acc[productName].quantity += sale.quantity || 1;
    acc[productName].count += 1;
    
    return acc;
  }, {});

  // Sort products by revenue and get top 10
  const topProducts = Object.entries(productSalesData)
    .sort(([, a], [, b]) => b.revenue - a.revenue)
    .slice(0, 10);

  const productLabels = topProducts.map(([name]) => name);
  const productRevenues = topProducts.map(([, data]) => data.revenue);
  const productProfits = topProducts.map(([, data]) => data.profit);

  const revenueChartData = {
    labels: storeLabels,
    datasets: [
      {
        label: 'Revenue by Store ($)',
        data: storeRevenues,
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
        label: 'Profit by Store ($)',
        data: storeProfits,
        backgroundColor: 'rgba(75, 192, 192, 0.8)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 1,
      },
    ],
  };

  const quantityChartData = {
    labels: storeLabels,
    datasets: [
      {
        label: 'Items Sold by Store',
        data: storeQuantities,
        backgroundColor: 'rgba(255, 99, 132, 0.8)',
        borderColor: 'rgba(255, 99, 132, 1)',
        borderWidth: 1,
      },
    ],
  };

  const brandChartData = {
    labels: brandLabels,
    datasets: [
      {
        label: 'Revenue by Brand ($)',
        data: brandRevenues,
        backgroundColor: [
          'rgba(75, 192, 192, 0.8)',
          'rgba(54, 162, 235, 0.8)',
          'rgba(255, 206, 86, 0.8)',
          'rgba(255, 99, 132, 0.8)',
          'rgba(153, 102, 255, 0.8)',
        ],
        borderColor: [
          'rgba(75, 192, 192, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(255, 206, 86, 1)',
          'rgba(255, 99, 132, 1)',
          'rgba(153, 102, 255, 1)',
        ],
        borderWidth: 2,
      },
    ],
  };

  const productChartData = {
    labels: productLabels,
    datasets: [
      {
        label: 'Revenue by Product ($)',
        data: productRevenues,
        backgroundColor: 'rgba(255, 159, 64, 0.8)',
        borderColor: 'rgba(255, 159, 64, 1)',
        borderWidth: 1,
      },
    ],
  };

  const revenueOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Revenue by Store',
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

  const profitOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Profit by Store',
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

  const quantityOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Items Sold by Store',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  const brandOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom' as const,
      },
      title: {
        display: true,
        text: 'Revenue by Brand',
      },
    },
  };

  const productOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Top 10 Products by Revenue',
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

  const totalRevenue = sales.reduce((sum, sale) => {
    return sum + ((sale.payout || 0) - (sale.discount || 0));
  }, 0);

  const totalProfit = sales.reduce((sum, sale) => {
    const revenue = (sale.payout || 0) - (sale.discount || 0);
    const cost = (sale.cost || 0) * (sale.quantity || 1);
    return sum + (revenue - cost);
  }, 0);

  const totalSales = sales.length;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-r from-green-500 to-blue-600 text-white p-6 rounded-lg">
          <h3 className="text-xl font-bold mb-2">Total Revenue</h3>
          <p className="text-3xl font-bold">${totalRevenue.toLocaleString()}</p>
          <p className="text-green-100">From {totalSales} sales</p>
        </div>
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white p-6 rounded-lg">
          <h3 className="text-xl font-bold mb-2">Total Profit</h3>
          <p className="text-3xl font-bold">${totalProfit.toLocaleString()}</p>
          <p className="text-emerald-100">{((totalProfit / totalRevenue) * 100).toFixed(1)}% margin</p>
        </div>
        <div className="bg-gradient-to-r from-purple-500 to-pink-600 text-white p-6 rounded-lg">
          <h3 className="text-xl font-bold mb-2">Active Stores</h3>
          <p className="text-3xl font-bold">{storeLabels.length}</p>
          <p className="text-purple-100">With sales activity</p>
        </div>
      </div>

      {/* Store Performance Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <Bar data={revenueChartData} options={revenueOptions} />
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <Bar data={profitChartData} options={profitOptions} />
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <Bar data={quantityChartData} options={quantityOptions} />
        </div>
      </div>

      {/* Brand and Product Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <Doughnut data={brandChartData} options={brandOptions} />
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <h4 className="text-lg font-semibold mb-4">Brand Performance Summary</h4>
              <div className="space-y-2">
                {brandLabels.slice(0, 5).map((brand, index) => (
                  <div key={brand} className="flex justify-between items-center">
                    <span className="text-sm font-medium">{brand}</span>
                    <div className="text-right">
                      <div className="text-sm font-medium">${brandRevenues[index]?.toLocaleString() || 0}</div>
                      <div className="text-xs text-muted-foreground">${brandProfits[index]?.toLocaleString() || 0} profit</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Product Performance */}
      <div className="bg-white p-4 rounded-lg shadow">
        <Bar data={productChartData} options={productOptions} />
      </div>

      {/* Product Performance Summary */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-foreground mb-4">Top Products Performance</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {topProducts.slice(0, 6).map(([productName, data]) => (
            <div key={productName} className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground truncate">{productName}</p>
                  <p className="text-sm text-muted-foreground">{data.count} sales</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-foreground">${data.revenue.toLocaleString()}</p>
                  <p className="text-sm text-green-600">${data.profit.toLocaleString()} profit</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 