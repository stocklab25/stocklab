'use client';

import { useEffect, useState } from 'react';
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
  consigner: string;
  consignDate: string;
  status: string;
  location: string;
  product?: {
    brand: string;
    name: string;
    color: string;
    style: string;
  };
}

export default function Inventory() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [inventoryRes, productsRes] = await Promise.all([
          fetch('/api/inventory'),
          fetch('/api/products'),
        ]);
        
        const inventoryData = await inventoryRes.json();
        const productsData: Product[] = await productsRes.json();
        
        // Merge product data with inventory
        const enrichedInventory = inventoryData.map((item: InventoryItem) => ({
          ...item,
          product: productsData.find((p: Product) => p.id === item.productId),
        }));
        
        setInventory(enrichedInventory);
      } catch (error) {
        console.error('Error fetching inventory:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredInventory = inventory.filter(item => {
    const matchesSearch = 
      item.product?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.product?.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.consigner.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === '' || item.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'In-Stock':
        return 'bg-green-100 text-green-800';
      case 'Sold':
        return 'bg-blue-100 text-blue-800';
      case 'Returned':
        return 'bg-yellow-100 text-yellow-800';
      case 'Out-of-Stock':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-accent text-accent-foreground';
    }
  };

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'New':
        return 'bg-green-100 text-green-800';
      case 'Used':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-accent text-accent-foreground';
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-muted-foreground">Loading inventory...</div>
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
            <h1 className="text-3xl font-bold text-foreground">Inventory</h1>
            <p className="text-muted-foreground mt-2">Manage your inventory items</p>
          </div>
          <div className="flex space-x-3">
            <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
              📥 Stock In
            </button>
            <button className="px-4 py-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors">
              📤 Stock Out
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <Card>
          <div className="p-6">
            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Search by product name, brand, SKU, or consigner..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="">All Status</option>
                <option value="In-Stock">In Stock</option>
                <option value="Sold">Sold</option>
                <option value="Returned">Returned</option>
                <option value="Out-of-Stock">Out of Stock</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Inventory Table */}
        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">
                Inventory Items ({filteredInventory.length})
              </h3>
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <span>Total Value: ${filteredInventory.reduce((sum, item) => sum + item.cost, 0).toLocaleString()}</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 font-medium text-foreground">Product</th>
                    <th className="text-left py-3 px-4 font-medium text-foreground">SKU</th>
                    <th className="text-left py-3 px-4 font-medium text-foreground">Size</th>
                    <th className="text-left py-3 px-4 font-medium text-foreground">Condition</th>
                    <th className="text-left py-3 px-4 font-medium text-foreground">Cost</th>
                    <th className="text-left py-3 px-4 font-medium text-foreground">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-foreground">Location</th>
                    <th className="text-left py-3 px-4 font-medium text-foreground">Consigner</th>
                    <th className="text-right py-3 px-4 font-medium text-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInventory.map((item) => (
                    <tr key={item.id} className="border-b border-muted hover:bg-accent">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium text-foreground">{item.product?.brand}</p>
                          <p className="text-sm text-muted-foreground">{item.product?.name}</p>
                          <p className="text-xs text-muted-foreground">{item.product?.style}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm font-mono text-muted-foreground">{item.sku}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-foreground">{item.size}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getConditionColor(item.condition)}`}>
                          {item.condition}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-medium text-foreground">${item.cost}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(item.status)}`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-muted-foreground">{item.location}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-muted-foreground">{item.consigner}</span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button className="p-1 text-muted-foreground hover:text-foreground">
                            👁️
                          </button>
                          <button className="p-1 text-muted-foreground hover:text-foreground">
                            ✏️
                          </button>
                          <button className="p-1 text-muted-foreground hover:text-destructive">
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredInventory.length === 0 && (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No inventory items found</p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </Layout>
  );
} 