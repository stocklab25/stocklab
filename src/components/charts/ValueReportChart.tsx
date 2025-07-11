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
import { Bar, Pie } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

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

interface ValueReportChartProps {
  inventory: InventoryItem[];
}

export default function ValueReportChart({ inventory }: ValueReportChartProps) {
  // Process data for brand value distribution
  const brandValueData = inventory.reduce((acc: { [key: string]: number }, item) => {
    const brand = item.product?.brand || 'Unknown';
    const totalValue = (item.cost || 0) * (item.quantity || 1);
    acc[brand] = (acc[brand] || 0) + totalValue;
    return acc;
  }, {});

  const brandLabels = Object.keys(brandValueData);
  const brandValues = Object.values(brandValueData);

  // Process data for cost range distribution
  const costRanges = {
    'Under $50': 0,
    '$50 - $100': 0,
    '$100 - $200': 0,
    '$200 - $500': 0,
    'Over $500': 0,
  };

  inventory.forEach((item) => {
    const cost = item.cost || 0;
    if (cost < 50) costRanges['Under $50']++;
    else if (cost < 100) costRanges['$50 - $100']++;
    else if (cost < 200) costRanges['$100 - $200']++;
    else if (cost < 500) costRanges['$200 - $500']++;
    else costRanges['Over $500']++;
  });

  const costRangeLabels = Object.keys(costRanges);
  const costRangeValues = Object.values(costRanges);

  const brandValueChartData = {
    labels: brandLabels,
    datasets: [
      {
        label: 'Total Value by Brand ($)',
        data: brandValues,
        backgroundColor: [
          'rgba(54, 162, 235, 0.8)',
          'rgba(255, 99, 132, 0.8)',
          'rgba(255, 206, 86, 0.8)',
          'rgba(75, 192, 192, 0.8)',
          'rgba(153, 102, 255, 0.8)',
          'rgba(255, 159, 64, 0.8)',
        ],
        borderColor: [
          'rgba(54, 162, 235, 1)',
          'rgba(255, 99, 132, 1)',
          'rgba(255, 206, 86, 1)',
          'rgba(75, 192, 192, 1)',
          'rgba(153, 102, 255, 1)',
          'rgba(255, 159, 64, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };

  const costRangeChartData = {
    labels: costRangeLabels,
    datasets: [
      {
        label: 'Items by Cost Range',
        data: costRangeValues,
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

  const barOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Inventory Value by Brand',
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

  const pieOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom' as const,
      },
      title: {
        display: true,
        text: 'Items by Cost Range',
      },
    },
  };

  const totalInventoryValue = inventory.reduce((sum, item) => {
    return sum + ((item.cost || 0) * (item.quantity || 1));
  }, 0);

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6 rounded-lg">
        <h3 className="text-xl font-bold mb-2">Total Inventory Value</h3>
        <p className="text-3xl font-bold">${totalInventoryValue.toLocaleString()}</p>
        <p className="text-blue-100">Across {inventory.length} inventory items</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <Bar data={brandValueChartData} options={barOptions} />
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <Pie data={costRangeChartData} options={pieOptions} />
        </div>
      </div>
    </div>
  );
} 
