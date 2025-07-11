'use client';

import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Card } from '@/components/Card';
import Modal from '@/components/Modal';
import { useAuth } from '@/contexts/AuthContext';

interface Store {
  id: string;
  name: string;
  status: string;
}

interface Product {
  id: string;
  brand: string;
  name: string;
  color?: string;
  sku?: string;
}

interface StoreInventoryItem {
  id: string;
  storeId: string;
  inventoryItemId: string;
  quantity: number;
  createdAt: string;
  updatedAt: string;
  inventoryItem: {
    id: string;
    productId: string;
    sku: string;
    size: string;
    condition: string;
    cost: number;
    status: string;
    quantity: number;
    product: {
      id: string;
      brand: string;
      name: string;
      color: string;
      sku: string;
    };
  };
  store: {
    id: string;
    name: string;
    address: string;
  };
}

export default function StoreInventoryPage() {
  const { getAuthToken } = useAuth();
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState('');
  const [inventory, setInventory] = useState<StoreInventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddStoreModal, setShowAddStoreModal] = useState(false);
  const [newStore, setNewStore] = useState({
    name: '',
    address: '',
    phone: '',
    email: ''
  });
  const [addingStore, setAddingStore] = useState(false);

  useEffect(() => {
    const fetchStores = async () => {
      try {
        const token = await getAuthToken();
        if (!token) {
          
          setStores([]);
          return;
        }

        const response = await fetch('/api/stores', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          
          setStores([]);
          return;
        }

        const data = await response.json();
        
        // Ensure data is an array and not empty object
        if (Array.isArray(data) && data.length > 0) {
          setStores(data);
        } else if (Array.isArray(data)) {
          // Empty array is fine
          setStores([]);
        } else {
          
          setStores([]);
        }
      } catch (error) {
        
        setStores([]);
      }
    };

    fetchStores();
  }, [getAuthToken]);

  useEffect(() => {
    const fetchInventory = async () => {
      if (!selectedStoreId) {
        setInventory([]);
        return;
      }

      setLoading(true);
      try {
        const token = await getAuthToken();
        if (!token) {
          
          setInventory([]);
          return;
        }

        const response = await fetch(`/api/stores/${selectedStoreId}/inventory`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          
          setInventory([]);
          return;
        }

        const data = await response.json();
        setInventory(data);
      } catch (error) {
        
        setInventory([]);
      } finally {
        setLoading(false);
      }
    };

    fetchInventory();
  }, [selectedStoreId, getAuthToken]);

  const handleAddStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStore.name.trim()) return;

    setAddingStore(true);
    try {
      const token = await getAuthToken();
      if (!token) {
        
        return;
      }

      const response = await fetch('/api/stores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(newStore),
      });

      if (response.ok) {
        const createdStore = await response.json();
        setStores([...stores, createdStore]);
        setNewStore({ name: '', address: '', phone: '', email: '' });
        setShowAddStoreModal(false);
      } else {
        
      }
    } catch (error) {
      
    } finally {
      setAddingStore(false);
    }
  };

  return (
    <Layout>
      <div>
        <h1 className="text-2xl font-bold mb-6">Store Inventory</h1>
        <Card>
          <div className="p-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <label htmlFor="store-select" className="font-medium">Select Store:</label>
              <select
                id="store-select"
                value={selectedStoreId}
                onChange={e => setSelectedStoreId(e.target.value)}
                className="px-4 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="">-- Choose a store --</option>
                {Array.isArray(stores) && stores.map(store => (
                  <option key={store.id} value={store.id}>{store.name}</option>
                ))}
              </select>
            </div>
            <button
              onClick={() => setShowAddStoreModal(true)}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              + Add Store
            </button>
          </div>
        </Card>

        {selectedStoreId && (
          <Card>
            <div className="p-6">
              <h2 className="text-lg font-semibold mb-4">Inventory for {stores.find(s => s.id === selectedStoreId)?.name}</h2>
              {loading ? (
                <div>Loading...</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-4 font-medium text-foreground">Product</th>
                        <th className="text-left py-3 px-4 font-medium text-foreground">SKU</th>
                        <th className="text-center py-3 px-4 font-medium text-foreground">Quantity</th>
                        <th className="text-left py-3 px-4 font-medium text-foreground">Size</th>
                        <th className="text-left py-3 px-4 font-medium text-foreground">Condition</th>
                        <th className="text-left py-3 px-4 font-medium text-foreground">Cost</th>
                        <th className="text-left py-3 px-4 font-medium text-foreground">Store Quantity</th>
                        <th className="text-left py-3 px-4 font-medium text-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inventory.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="text-center py-8 text-muted-foreground">No inventory found for this store.</td>
                        </tr>
                      ) : (
                        inventory.map(item => (
                          <tr key={item.id} className="border-b border-muted hover:bg-accent">
                            <td className="py-2 px-4 text-sm">
                              <div>
                                <p className="font-medium text-foreground">{item.inventoryItem.product.brand}</p>
                                <p className="text-xs text-muted-foreground">{item.inventoryItem.product.name}</p>
                                <p className="text-xs text-muted-foreground">{item.inventoryItem.product.sku}</p>
                              </div>
                            </td>
                            <td className="py-2 px-4 text-sm">
                              <span className="font-mono">{item.inventoryItem.sku}</span>
                            </td>
                            <td className="py-2 px-4 text-sm text-center">
                              <span className="font-mono font-medium">{item.quantity}</span>
                            </td>
                            <td className="py-2 px-4 text-sm">
                              <span>{item.inventoryItem.size}</span>
                            </td>
                            <td className="py-2 px-4 text-sm">
                              <span>{item.inventoryItem.condition}</span>
                            </td>
                            <td className="py-2 px-4 text-sm">
                              <span>{item.inventoryItem.cost}</span>
                            </td>
                            <td className="py-2 px-4 text-sm">
                              <span>{item.quantity}</span>
                            </td>
                            <td className="py-2 px-4 text-sm">
                              {/* Actions will be added here if needed */}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Add Store Modal */}
        <Modal open={showAddStoreModal} onClose={() => setShowAddStoreModal(false)}>
          <div className="w-full">
            <h2 className="text-xl font-bold mb-4">Add New Store</h2>
            <form onSubmit={handleAddStore} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Store Name *</label>
                <input
                  type="text"
                  value={newStore.name}
                  onChange={(e) => setNewStore({ ...newStore, name: e.target.value })}
                  className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Enter store name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Address</label>
                <input
                  type="text"
                  value={newStore.address}
                  onChange={(e) => setNewStore({ ...newStore, address: e.target.value })}
                  className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Enter store address"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Phone</label>
                <input
                  type="tel"
                  value={newStore.phone}
                  onChange={(e) => setNewStore({ ...newStore, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Enter phone number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  value={newStore.email}
                  onChange={(e) => setNewStore({ ...newStore, email: e.target.value })}
                  className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Enter email address"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddStoreModal(false)}
                  className="flex-1 px-4 py-2 border border-input rounded-lg text-foreground hover:bg-accent transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingStore || !newStore.name.trim()}
                  className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {addingStore ? 'Adding...' : 'Add Store'}
                </button>
              </div>
            </form>
          </div>
        </Modal>
      </div>
    </Layout>
  );
} 
