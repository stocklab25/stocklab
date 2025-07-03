'use client';

import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { Card } from '@/components/Card';

interface ReportData {
  totalValue: number;
  totalItems: number;
  lowStockItems: number;
  topBrands: { brand: string; count: number }[];
  recentActivity: { type: string; count: number }[];
}

export default function Reports() {
  const [reportData, setReportData] = useState<ReportData>({
    totalValue: 0,
    totalItems: 0,
    lowStockItems: 0,
    topBrands: [],
    recentActivity: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReportData = async () => {
      try {
        const [inventoryRes, productsRes, transactionsRes] = await Promise.all([
          fetch('/api/inventory'),
          fetch('/api/products'),
          fetch('/api/transactions'),
        ]);

        const inventory = await inventoryRes.json();
        const products = await productsRes.json();
        const transactions = await transactionsRes.json();

        // Calculate report data
        const totalValue = inventory.reduce((sum: number, item: any) => sum + item.cost, 0);
        const totalItems = inventory.length;
        
        // Count items by brand
        const brandCounts: { [key: string]: number } = {};
        inventory.forEach((item: any) => {
          const product = products.find((p: any) => p.id === item.productId);
          if (product) {
            brandCounts[product.brand] = (brandCounts[product.brand] || 0) + 1;
          }
        });

        const topBrands = Object.entries(brandCounts)
          .map(([brand, count]) => ({ brand, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);

        // Recent activity by type
        const activityCounts: { [key: string]: number } = {};
        transactions.forEach((txn: any) => {
          activityCounts[txn.type] = (activityCounts[txn.type] || 0) + 1;
        });

        const recentActivity = Object.entries(activityCounts)
          .map(([type, count]) => ({ type, count }))
          .sort((a, b) => b.count - a.count);

        setReportData({
          totalValue,
          totalItems,
          lowStockItems: 0, // Would need business logic to determine
          topBrands,
          recentActivity,
        });
      } catch (error) {
        console.error('Error fetching report data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchReportData();
  }, []);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-muted-foreground">Loading reports...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Reports</h1>
            <p className="text-muted-foreground mt-2">Analytics and insights for your inventory</p>
          </div>
                      <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
            📊 Export Report
          </button>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <div className="p-6">
              <div className="flex items-center">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <span className="text-2xl">💰</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Total Inventory Value</p>
                  <p className="text-2xl font-bold text-foreground">${reportData.totalValue.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-6">
              <div className="flex items-center">
                <div className="p-3 bg-green-100 rounded-lg">
                  <span className="text-2xl">📦</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Total Items</p>
                  <p className="text-2xl font-bold text-foreground">{reportData.totalItems}</p>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-6">
              <div className="flex items-center">
                <div className="p-3 bg-yellow-100 rounded-lg">
                  <span className="text-2xl">⚠️</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Low Stock Items</p>
                  <p className="text-2xl font-bold text-gray-900">{reportData.lowStockItems}</p>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Detailed Reports */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Brands */}
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Top Brands by Item Count</h3>
              <div className="space-y-3">
                {reportData.topBrands.map((brand, index) => (
                  <div key={brand.brand} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="text-sm font-medium text-muted-foreground">#{index + 1}</span>
                      <span className="font-medium text-foreground">{brand.brand}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">{brand.count} items</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* Recent Activity */}
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Transaction Activity</h3>
              <div className="space-y-3">
                {reportData.recentActivity.map((activity) => (
                  <div key={activity.type} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="text-lg">
                        {activity.type === 'in' ? '📥' : 
                         activity.type === 'out' ? '📤' : 
                         activity.type === 'return' ? '↩️' : '🔄'}
                      </span>
                      <span className="font-medium text-foreground">
                        {activity.type === 'in' ? 'Stock In' : 
                         activity.type === 'out' ? 'Stock Out' : 
                         activity.type === 'return' ? 'Return' : activity.type}
                      </span>
                    </div>
                    <span className="text-sm text-muted-foreground">{activity.count} transactions</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>

        {/* Report Types */}
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Available Reports</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <button className="p-4 text-left border border-border rounded-lg hover:border-primary hover:bg-accent transition-colors">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">📊</span>
                  <div>
                    <p className="font-medium text-foreground">Inventory Summary</p>
                    <p className="text-sm text-muted-foreground">Overview of all items</p>
                  </div>
                </div>
              </button>

              <button className="p-4 text-left border border-border rounded-lg hover:border-primary hover:bg-accent transition-colors">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">💰</span>
                  <div>
                    <p className="font-medium text-foreground">Value Report</p>
                    <p className="text-sm text-muted-foreground">Total inventory value</p>
                  </div>
                </div>
              </button>

              <button className="p-4 text-left border border-border rounded-lg hover:border-primary hover:bg-accent transition-colors">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">🔄</span>
                  <div>
                    <p className="font-medium text-foreground">Transaction History</p>
                    <p className="text-sm text-muted-foreground">All stock movements</p>
                  </div>
                </div>
              </button>

              <button className="p-4 text-left border border-border rounded-lg hover:border-primary hover:bg-accent transition-colors">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">👥</span>
                  <div>
                    <p className="font-medium text-foreground">Consigner Report</p>
                    <p className="text-sm text-muted-foreground">Items by consigner</p>
                  </div>
                </div>
              </button>

              <button className="p-4 text-left border border-border rounded-lg hover:border-primary hover:bg-accent transition-colors">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">📍</span>
                  <div>
                    <p className="font-medium text-foreground">Location Report</p>
                    <p className="text-sm text-muted-foreground">Items by location</p>
                  </div>
                </div>
              </button>

              <button className="p-4 text-left border border-border rounded-lg hover:border-primary hover:bg-accent transition-colors">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">📈</span>
                  <div>
                    <p className="font-medium text-foreground">Trends Analysis</p>
                    <p className="text-sm text-muted-foreground">Sales and stock trends</p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </Card>
      </div>
    </Layout>
  );
} 