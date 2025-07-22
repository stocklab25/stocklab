'use client';

import { useState, useEffect, useRef } from 'react';
import Layout from '@/components/Layout';
import { Card } from '@/components/Card';
import Modal from '@/components/Modal';
import { useAuth } from '@/contexts/AuthContext';
import TransferToStoreModal from '@/components/TransferToStoreModal';
import { useInventory } from '@/hooks';

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
  transferCost: number;
  createdAt: string;
  updatedAt: string;
  inventoryItem: {
    id: string;
    productId: string;
    sku: string;
    stocklabSku?: string;
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
  store?: {
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
  const [isExporting, setIsExporting] = useState(false);
  const [showAddStoreModal, setShowAddStoreModal] = useState(false);
  const [newStore, setNewStore] = useState({
    name: '',
    address: '',
    phone: '',
    email: ''
  });
  const [addingStore, setAddingStore] = useState(false);
  const { data: warehouseInventory, isLoading: isWarehouseLoading, isError: isWarehouseError, mutate: mutateWarehouse } = useInventory();
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{ cost: string; quantity: string }>({ cost: '', quantity: '' });
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

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
  }, []);

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

        let response;
        if (selectedStoreId === 'ALL') {
          // Fetch all store inventory
          response = await fetch('/api/stores/inventory', {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });
        } else {
          // Fetch specific store inventory
          response = await fetch(`/api/stores/${selectedStoreId}/inventory`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });
        }

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
  }, [selectedStoreId]);

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

  const exportToCSV = async () => {
    setIsExporting(true);
    try {
      const token = await getAuthToken();
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      const url = selectedStoreId === 'ALL' 
        ? '/api/stores/inventory/export'
        : `/api/stores/inventory/export?storeId=${selectedStoreId}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to export store inventory');
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `store-inventory-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleTransferToStore = async (transferData: {
    inventoryItemId: string;
    storeId: string;
    quantity: number;
    transferCost: number;
    notes?: string;
  }) => {
    setIsTransferring(true);
    try {
      const token = await getAuthToken();
      if (!token) {
        throw new Error('No authentication token found');
      }
      const response = await fetch('/api/transfers/warehouse-to-store', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(transferData),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to transfer to store');
      }
      // Refresh warehouse inventory and store inventory
      mutateWarehouse();
      setShowTransferModal(false);
      // Optionally, refresh store inventory here
    } catch (error) {
      console.error('Transfer failed:', error);
    } finally {
      setIsTransferring(false);
    }
  };

  const handleEditClick = (item: StoreInventoryItem) => {
    setEditingRowId(item.id);
    setEditValues({ cost: item.transferCost.toString(), quantity: item.quantity.toString() });
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditValues({ ...editValues, [e.target.name]: e.target.value });
  };

  const handleEditCancel = () => {
    setEditingRowId(null);
    setEditValues({ cost: '', quantity: '' });
  };

  const handleEditSave = async (item: StoreInventoryItem) => {
    // Call API to update store inventory item
    const token = await getAuthToken();
    if (!token) return;
    const response = await fetch(`/api/stores/${item.storeId}/inventory`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        id: item.id,
        transferCost: parseFloat(editValues.cost),
        quantity: parseInt(editValues.quantity, 10),
      }),
    });
    if (response.ok) {
      // Update local state
      setInventory((prev) => prev.map((row) => row.id === item.id ? { ...row, transferCost: parseFloat(editValues.cost), quantity: parseInt(editValues.quantity, 10) } : row));
      setEditingRowId(null);
      setEditValues({ cost: '', quantity: '' });
    }
  };

  const handleDelete = async (item: StoreInventoryItem) => {
    if (!window.confirm('Are you sure you want to delete this store inventory item?')) return;
    const token = await getAuthToken();
    if (!token) return;
    const response = await fetch(`/api/stores/${item.storeId}/inventory`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ id: item.id }),
    });
    if (response.ok) {
      setInventory((prev) => prev.filter((row) => row.id !== item.id));
    }
  };

  const toggleDropdown = (itemId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (openDropdown === itemId) {
      setOpenDropdown(null);
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    setDropdownPosition({
      x: rect.right - 192,
      y: rect.bottom + 5
    });
    setOpenDropdown(itemId);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (target.closest('.dropdown-menu')) return;
      if (openDropdown) setOpenDropdown(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openDropdown]);

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
                <option value="ALL">ALL Stores</option>
                {Array.isArray(stores) && stores.map(store => (
                  <option key={store.id} value={store.id}>{store.name}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowTransferModal(true)}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                + Add to Store
              </button>
              <button 
                onClick={exportToCSV}
                disabled={isExporting || !selectedStoreId}
                className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isExporting ? 'Exporting...' : 'Export CSV'}
              </button>
            </div>
          </div>
        </Card>

        {selectedStoreId && (
          <Card>
            <div className="p-6">
              <h2 className="text-lg font-semibold mb-4">
                {selectedStoreId === 'ALL' 
                  ? 'Inventory for All Stores' 
                  : `Inventory for ${stores.find(s => s.id === selectedStoreId)?.name}`
                }
              </h2>
              {loading ? (
                <div>Loading...</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        {selectedStoreId === 'ALL' && (
                          <th className="text-left py-3 px-4 font-medium text-foreground">Store</th>
                        )}
                        <th className="text-left py-3 px-4 font-medium text-foreground">Product</th>
                        <th className="text-left py-3 px-4 font-medium text-foreground">StockLab SKU</th>
                        <th className="text-left py-3 px-4 font-medium text-foreground">SKU</th>
                        <th className="text-center py-3 px-4 font-medium text-foreground">Store Quantity</th>
                        <th className="text-left py-3 px-4 font-medium text-foreground">Size</th>
                        <th className="text-left py-3 px-4 font-medium text-foreground">Condition</th>
                        <th className="text-left py-3 px-4 font-medium text-foreground">Warehouse Cost</th>
                        <th className="text-left py-3 px-4 font-medium text-foreground">Store Cost</th>
                        <th className="text-left py-3 px-4 font-medium text-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inventory.length === 0 ? (
                        <tr>
                          <td colSpan={selectedStoreId === 'ALL' ? 10 : 9} className="text-center py-8 text-muted-foreground">
                            {selectedStoreId === 'ALL' ? 'No inventory found across all stores.' : 'No inventory found for this store.'}
                          </td>
                        </tr>
                      ) : (
                        inventory.map(item => (
                          <tr key={item.id} className="border-b border-muted hover:bg-accent">
                            {selectedStoreId === 'ALL' && (
                              <td className="py-2 px-4 text-sm">
                                <span className="font-medium text-blue-600">{item.store?.name || 'Unknown Store'}</span>
                              </td>
                            )}
                            <td className="py-2 px-4 text-sm">
                              <div>
                                <p className="font-medium text-foreground">{item.inventoryItem.product.brand}</p>
                                <p className="text-xs text-muted-foreground">{item.inventoryItem.product.name}</p>
                                <p className="text-xs text-muted-foreground">{item.inventoryItem.product.sku}</p>
                              </div>
                            </td>
                            <td className="py-2 px-4 text-sm">
                              <span className="font-mono text-sm text-blue-600">{item.inventoryItem.stocklabSku || 'N/A'}</span>
                            </td>
                            <td className="py-2 px-4 text-sm">
                              <span className="font-mono">{item.inventoryItem.sku}</span>
                            </td>
                            <td className="py-2 px-4 text-sm text-center">
                              {editingRowId === item.id ? (
                                <input
                                  type="number"
                                  name="quantity"
                                  value={editValues.quantity}
                                  onChange={handleEditChange}
                                  className="w-20 px-2 py-1 border rounded"
                                />
                              ) : (
                                <span className="font-mono font-medium">{item.quantity}</span>
                              )}
                            </td>
                            <td className="py-2 px-4 text-sm">
                              <span>{item.inventoryItem.size}</span>
                            </td>
                            <td className="py-2 px-4 text-sm">
                              <span>{item.inventoryItem.condition}</span>
                            </td>
                            <td className="py-2 px-4 text-sm">
                              <span className="font-mono">${item.inventoryItem.cost}</span>
                            </td>
                            <td className="py-2 px-4 text-sm">
                             {editingRowId === item.id ? (
                               <input
                                 type="number"
                                 name="cost"
                                 value={editValues.cost}
                                 onChange={handleEditChange}
                                 className="w-24 px-2 py-1 border rounded"
                                 step="0.01"
                               />
                             ) : (
                               <span className="font-mono font-medium text-blue-600">${item.transferCost}</span>
                             )}
                            </td>
                            <td className="py-2 px-4 text-sm">
                             {editingRowId === item.id ? (
                               <div className="flex gap-2">
                                 <button
                                   className="px-2 py-1 bg-primary text-white rounded"
                                   onClick={() => handleEditSave(item)}
                                 >
                                   Save
                                 </button>
                                 <button
                                   className="px-2 py-1 bg-gray-300 text-gray-800 rounded"
                                   onClick={handleEditCancel}
                                 >
                                   Cancel
                                 </button>
                               </div>
                             ) : (
                               <button
                                 className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
                                 onClick={(e) => toggleDropdown(item.id, e)}
                               >
                                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                   <circle cx="12" cy="12" r="1.5" />
                                   <circle cx="19.5" cy="12" r="1.5" />
                                   <circle cx="4.5" cy="12" r="1.5" />
                                 </svg>
                               </button>
                             )}
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

        <TransferToStoreModal
          isOpen={showTransferModal}
          onClose={() => setShowTransferModal(false)}
          onSubmit={handleTransferToStore}
          isLoading={isTransferring}
          inventoryItems={warehouseInventory}
          stores={stores}
        />
      </div>

      {/* Dropdown Menu - Positioned outside table */}
      {openDropdown && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setOpenDropdown(null)}
          />
          <div 
            className="fixed z-50 bg-white rounded-md shadow-lg border border-gray-200 w-48 dropdown-menu"
            style={{
              left: `${dropdownPosition.x}px`,
              top: `${dropdownPosition.y}px`
            }}
          >
            <div className="py-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const item = inventory.find((row) => row.id === openDropdown);
                  if (item) handleEditClick(item);
                  setOpenDropdown(null);
                }}
                className="w-full text-left px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 flex items-center gap-2"
              >
                Edit
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const item = inventory.find((row) => row.id === openDropdown);
                  if (item) handleDelete(item);
                  setOpenDropdown(null);
                }}
                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
              >
                Delete
              </button>
            </div>
          </div>
        </>
      )}
    </Layout>
  );
} 
