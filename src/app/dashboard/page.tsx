'use client';

import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { Card } from '@/components/Card';
import ProtectedRoute from '@/components/ProtectedRoute';

interface DashboardStats {
  totalProducts: number;
  totalInventory: number;
  totalValue: number;
  recentTransactions: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalProducts: 0,
    totalInventory: 0,
    totalValue: 0,
    recentTransactions: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [productsRes, inventoryRes, transactionsRes] = await Promise.all([
          fetch('/api/products'),
          fetch('/api/inventory'),
          fetch('/api/transactions'),
        ]);

        const products = await productsRes.json();
        const inventory = await inventoryRes.json();
        const transactions = await transactionsRes.json();

        const totalValue = inventory.reduce((sum: number, item: any) => sum + item.cost, 0);
        const recentTransactions = transactions.filter((txn: any) => {
          const txnDate = new Date(txn.date);
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          return txnDate >= weekAgo;
        }).length;

        setStats({
          totalProducts: products.length,
          totalInventory: inventory.length,
          totalValue,
          recentTransactions,
        });
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-lg">
                <span className="text-2xl">👟</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total Products</p>
                <p className="text-2xl font-bold text-foreground">{stats.totalProducts}</p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-lg">
                <span className="text-2xl">📦</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Inventory Items</p>
                <p className="text-2xl font-bold text-foreground">{stats.totalInventory}</p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <span className="text-2xl">💰</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total Value</p>
                <p className="text-2xl font-bold text-foreground">${stats.totalValue.toLocaleString()}</p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center">
              <div className="p-3 bg-purple-100 rounded-lg">
                <span className="text-2xl">🔄</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Recent Transactions</p>
                <p className="text-2xl font-bold text-foreground">{stats.recentTransactions}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <h3 className="text-lg font-semibold text-foreground mb-4">Recent Transactions</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-accent rounded-lg">
                <div className="flex items-center space-x-3">
                  <span className="text-green-500">📥</span>
                  <div>
                    <p className="font-medium text-foreground">Stock In</p>
                    <p className="text-sm text-muted-foreground">Jordan 1 Retro High OG</p>
                  </div>
                </div>
                <span className="text-sm text-muted-foreground">2 hours ago</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-accent rounded-lg">
                <div className="flex items-center space-x-3">
                  <span className="text-red-500">📤</span>
                  <div>
                    <p className="font-medium text-foreground">Stock Out</p>
                    <p className="text-sm text-muted-foreground">Nike Dunk Low Panda</p>
                  </div>
                </div>
                <span className="text-sm text-muted-foreground">1 day ago</span>
              </div>
            </div>
          </Card>

          <Card>
            <h3 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <button className="w-full p-3 text-left bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
                + Add New Product
              </button>
              <button className="w-full p-3 text-left bg-accent text-accent-foreground rounded-lg hover:bg-accent/80 transition-colors">
                📥 Stock In Items
              </button>
              <button className="w-full p-3 text-left bg-accent text-accent-foreground rounded-lg hover:bg-accent/80 transition-colors">
                📤 Stock Out Items
              </button>
              <button className="w-full p-3 text-left bg-accent text-accent-foreground rounded-lg hover:bg-accent/80 transition-colors">
                📊 Generate Report
              </button>
            </div>
          </Card>
        </div>
      </div>
      </Layout>
    </ProtectedRoute>
  );
} 