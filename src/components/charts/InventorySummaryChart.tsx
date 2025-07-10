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

interface InventoryItem {
  id: string;
  productId: string;
  cost: number;
  quantity: number;
  condition: string;
  product?: {
    id: string;
    brand: string;
    name: string;
  };
}

interface InventorySummaryChartProps {
  inventory: InventoryItem[];
}

export default function InventorySummaryChart({ inventory }: InventorySummaryChartProps) {
  // Process data for brand distribution
  const brandData = inventory.reduce((acc: { [key: string]: number }, item) => {
    const brand = item.product?.brand || 'Unknown';
    acc[brand] = (acc[brand] || 0) + item.quantity;
    return acc;
  }, {});

  const brandLabels = Object.keys(brandData);
  const brandValues = Object.values(brandData);

  // Process data for condition distribution
  const conditionData = inventory.reduce((acc: { [key: string]: number }, item) => {
    const condition = item.condition || 'Unknown';
    acc[condition] = (acc[condition] || 0) + item.quantity;
    return acc;
  }, {});

  const conditionLabels = Object.keys(conditionData);
  const conditionValues = Object.values(conditionData);

  const brandChartData = {
    labels: brandLabels,
    datasets: [
      {
        label: 'Items by Brand',
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

  const conditionChartData = {
    labels: conditionLabels,
    datasets: [
      {
        label: 'Items by Condition',
        data: conditionValues,
        backgroundColor: [
          'rgba(75, 192, 192, 0.8)',
          'rgba(255, 206, 86, 0.8)',
          'rgba(255, 99, 132, 0.8)',
        ],
        borderColor: [
          'rgba(75, 192, 192, 1)',
          'rgba(255, 206, 86, 1)',
          'rgba(255, 99, 132, 1)',
        ],
        borderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Inventory Distribution',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  const doughnutOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom' as const,
      },
      title: {
        display: true,
        text: 'Items by Condition',
      },
    },
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <Bar data={brandChartData} options={options} />
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <Doughnut data={conditionChartData} options={doughnutOptions} />
        </div>
      </div>
    </div>
  );
} 