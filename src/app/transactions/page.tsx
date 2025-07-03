'use client';

import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Card } from '@/components/Card';

interface Product {
  id: string;
  brand: string;
  name: string;
  color: string;
  style: string;
}

interface InventoryItem {
  id: string;
  productId: string;
  sku: string;
  size: string;
  condition: string;
  cost: number;
  status: string;
  location: string;
  consigner: string;
}

interface StockTransaction {
  id: string;
  itemId: string;
  type: string;
  quantity: number;
  date: string;
  toLocation?: string;
  fromLocation?: string;
  user: string;
  notes: string;
  item?: {
    sku: string;
    product?: {
      brand: string;
      name: string;
    };
  };
}

export default function Transactions() {
  const [transactions, setTransactions] = useState<StockTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [transactionsRes, inventoryRes, productsRes] = await Promise.all([
          fetch('/api/transactions'),
          fetch('/api/inventory'),
          fetch('/api/products'),
        ]);
        
        const transactionsData = await transactionsRes.json();
        const inventoryData: InventoryItem[] = await inventoryRes.json();
        const productsData: Product[] = await productsRes.json();
        
        // Merge data
        const enrichedTransactions = transactionsData.map((txn: StockTransaction) => {
          const item = inventoryData.find((i: InventoryItem) => i.id === txn.itemId);
          const product = item ? productsData.find((p: Product) => p.id === item.productId) : null;
          
          return {
            ...txn,
            item: {
              sku: item?.sku || '',
              product: product ? {
                brand: product.brand,
                name: product.name,
              } : null,
            },
          };
        });
        
        setTransactions(enrichedTransactions);
      } catch (error) {
        console.error('Error fetching transactions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredTransactions = transactions.filter(txn => {
    const matchesSearch = 
      txn.item?.product?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      txn.item?.product?.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
      txn.item?.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      txn.user.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = typeFilter === '' || txn.type === typeFilter;
    
    return matchesSearch && matchesType;
  });

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'in':
        return '📥';
      case 'out':
        return '📤';
      case 'return':
        return '↩️';
      default:
        return '🔄';
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'in':
        return 'text-green-600';
      case 'out':
        return 'text-red-600';
      case 'return':
        return 'text-yellow-600';
      default:
        return 'text-muted-foreground';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-muted-foreground">Loading transactions...</div>
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
            <h1 className="text-3xl font-bold text-foreground">Transactions</h1>
            <p className="text-muted-foreground mt-2">Track all stock movements</p>
          </div>
          <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
            + New Transaction
          </button>
        </div>

        {/* Search and Filters */}
        <Card>
          <div className="p-6">
            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Search by product name, brand, SKU, or user..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <select 
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-4 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="">All Types</option>
                <option value="in">Stock In</option>
                <option value="out">Stock Out</option>
                <option value="return">Return</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Transactions Table */}
        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">
                Stock Transactions ({filteredTransactions.length})
              </h3>
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <span>Showing {filteredTransactions.length} of {transactions.length} transactions</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 font-medium text-foreground">Type</th>
                    <th className="text-left py-3 px-4 font-medium text-foreground">Product</th>
                    <th className="text-left py-3 px-4 font-medium text-foreground">SKU</th>
                    <th className="text-left py-3 px-4 font-medium text-foreground">Quantity</th>
                    <th className="text-left py-3 px-4 font-medium text-foreground">Location</th>
                    <th className="text-left py-3 px-4 font-medium text-foreground">User</th>
                    <th className="text-left py-3 px-4 font-medium text-foreground">Date</th>
                    <th className="text-left py-3 px-4 font-medium text-foreground">Notes</th>
                    <th className="text-right py-3 px-4 font-medium text-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((txn) => (
                    <tr key={txn.id} className="border-b border-muted hover:bg-accent">
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          <span className="text-lg">{getTransactionIcon(txn.type)}</span>
                          <span className={`font-medium ${getTransactionColor(txn.type)}`}>
                            {txn.type === 'in' ? 'Stock In' : 
                             txn.type === 'out' ? 'Stock Out' : 
                             txn.type === 'return' ? 'Return' : txn.type}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium text-foreground">{txn.item?.product?.brand}</p>
                          <p className="text-sm text-muted-foreground">{txn.item?.product?.name}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm font-mono text-muted-foreground">{txn.item?.sku}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-medium text-foreground">{txn.quantity}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-muted-foreground">
                          {txn.type === 'in' ? txn.toLocation : txn.fromLocation}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-muted-foreground">{txn.user}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-muted-foreground">{formatDate(txn.date)}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-muted-foreground truncate max-w-xs block">
                          {txn.notes}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button className="p-1 text-muted-foreground hover:text-foreground">
                            👁️
                          </button>
                          <button className="p-1 text-muted-foreground hover:text-foreground">
                            ✏️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredTransactions.length === 0 && (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No transactions found</p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </Layout>
  );
} 