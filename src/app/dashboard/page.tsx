'use client';

import { useMemo } from 'react';
import Layout from '@/components/Layout';
import { Card } from '@/components/Card';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useProducts, useInventory, useTransactions } from '@/hooks';

interface DashboardStats {
  totalProducts: number;
  totalInventory: number;
  totalValue: number;
  recentTransactions: number;
}

export default function Dashboard() {
  const { data: products, isLoading: productsLoading } = useProducts();
  const { data: inventory, isLoading: inventoryLoading } = useInventory();
  const { data: transactions, isLoading: transactionsLoading } = useTransactions();

  const stats = useMemo<DashboardStats>(() => {
    const totalValue = inventory.reduce((sum: number, item: any) => sum + Number(item.cost), 0);
    const recentTransactions = transactions.filter((txn: any) => {
      const txnDate = new Date(txn.date);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return txnDate >= weekAgo;
    }).length;

    return {
      totalProducts: products.length,
      totalInventory: inventory.length,
      totalValue,
      recentTransactions,
    };
  }, [products, inventory, transactions]);

  const isLoading = productsLoading || inventoryLoading || transactionsLoading;

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
              {transactions.slice(0, 5).map((txn: any) => (
                <div key={txn.id} className="flex items-center justify-between p-3 bg-accent rounded-lg">
                  <div className="flex items-center space-x-3">
                    <span className={txn.type.toLowerCase() === 'in' ? 'text-green-500' : 'text-red-500'}>
                      {txn.type.toLowerCase() === 'in' ? '📥' : '📤'}
                    </span>
                    <div>
                      <p className="font-medium text-foreground">
                        {txn.type.charAt(0).toUpperCase() + txn.type.slice(1).toLowerCase()}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {txn.inventoryItem?.product?.name || 'Unknown Product'}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {new Date(txn.date).toLocaleDateString()}
                  </span>
                </div>
              ))}
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