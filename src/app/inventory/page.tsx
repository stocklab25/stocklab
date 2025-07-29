'use client';

import { useState, useRef, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Card } from '@/components/Card';
import { StockInIcon, EditIcon, DeleteIcon, MoreIcon } from '@/utils/icons';
import { useAuth } from '@/contexts/AuthContext';

import AddInventoryModal from '@/components/AddInventoryModal';
import BulkTransferModal from '@/components/BulkTransferModal';
import { useInventory } from '@/hooks';
import { useSettings } from '@/contexts/SettingsContext';
import PromptModal from '@/components/PromptModal';
import Toast from '@/components/Toast';

interface Product {
  id: string;
  brand: string;
  name: string;
  color?: string;
  sku?: string;
  quantity?: number;
}

interface InventoryItem {
  id: string;
  productId: string;
  sku: string;
  stocklabSku?: string;
  size: string;
  condition: string;
  cost: number;
  status: string;
  quantity: number;
  note?: string;
  createdAt: string;
  updatedAt: string;
  product: {
    id: string;
    brand: string;
    name: string;
    color: string;
    sku: string;
  };
}

export default function Inventory() {
  const { data: inventory, isLoading, isError, mutate } = useInventory();
  const { settings } = useSettings();
  const { getAuthToken } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ x: 0, y: 0 });

  const [showAddInventoryModal, setShowAddInventoryModal] = useState(false);
  const [stores, setStores] = useState<Array<{ id: string; name: string }>>([]);
  const [isTransferring, setIsTransferring] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{ size: string; condition: string; note: string; cost: string }>({ size: '', condition: '', note: '', cost: '' });
  const [isRowSaving, setIsRowSaving] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [showBulkTransferModal, setShowBulkTransferModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedItemToDelete, setSelectedItemToDelete] = useState<InventoryItem | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);


  const filteredInventory = inventory.filter((item: InventoryItem) => {
    const matchesSearch = 
      item.product?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.product?.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.stocklabSku && item.stocklabSku.toLowerCase().includes(searchTerm.toLowerCase())) ||
      item.size.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });



  // Update getConditionColor to match purchase orders
  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'NEW':
        return 'bg-green-100 text-green-800';
      case 'PRE_OWNED':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-accent text-accent-foreground';
    }
  };

  const getNoteColor = (note: string | null | undefined) => {
    if (!note) return '';
    switch (note) {
      case 'DMG_BOX':
        return 'bg-red-100 text-red-800';
      case 'NO_BOX':
        return 'bg-orange-100 text-orange-800';
      case 'REP_BOX':
        return 'bg-blue-100 text-blue-800';
      case 'FLAWED':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getNoteDisplayName = (note: string | null | undefined) => {
    switch (note) {
      case 'DMG_BOX': return 'DMG Box';
      case 'NO_BOX': return 'No Box';
      case 'REP_BOX': return 'REP Box';
      case 'FLAWED': return 'Flawed';
      case '':
      case null:
      case undefined:
        return '-';
      default:
        return note;
    }
  };

  const getNoteBadgeStyle = (note: string | null | undefined) => {
    switch (note) {
      case 'DMG_BOX': return 'bg-red-100 text-red-800';
      case 'NO_BOX': return 'bg-orange-100 text-orange-800';
      case 'REP_BOX': return 'bg-blue-100 text-blue-800';
      case 'FLAWED': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getNoteBadgeLabel = (note: string | null | undefined) => {
    switch (note) {
      case 'DMG_BOX': return 'DMG Box';
      case 'NO_BOX': return 'No Box';
      case 'REP_BOX': return 'REP Box';
      case 'FLAWED': return 'Flawed';
      default: return note || '';
    }
  };

  const handleDeleteItem = (item: InventoryItem) => {
    setSelectedItemToDelete(item);
    setShowDeleteModal(true);
    setOpenDropdown(null);
  };

  const confirmDeleteItem = async () => {
    if (!selectedItemToDelete) return;
    
    setIsDeleting(true);
    
    try {
      const token = await getAuthToken();
      if (!token) {
        console.error('No authentication token found');
        return;
      }

      const response = await fetch(`/api/inventory/${selectedItemToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        // Refresh the inventory data
        mutate();
        setShowDeleteModal(false);
        setSelectedItemToDelete(null);
        
        // Show success message with warning if present
        if (result.warning) {
          setToast({ type: 'success', message: `Item deleted successfully. ${result.warning}` });
        } else {
          setToast({ type: 'success', message: 'Item deleted successfully.' });
        }
      } else {
        const errorData = await response.json();
        setToast({ type: 'error', message: `Failed to delete item: ${errorData.error || 'Unknown error'}` });
      }
    } catch (error) {
      console.error('Error deleting inventory item:', error);
      setToast({ type: 'error', message: 'Failed to delete inventory item' });
    } finally {
      setIsDeleting(false);
    }
  };



  const handleEditClick = (item: InventoryItem) => {
    setEditingRowId(item.id);
    setEditValues({
      size: item.size,
      condition: item.condition,
      note: item.note === null || item.note === undefined ? '' : item.note,
      cost: item.cost.toString(),
    });
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setEditValues({ ...editValues, [e.target.name]: e.target.value });
  };

  const handleEditCancel = () => {
    setEditingRowId(null);
    setEditValues({ size: '', condition: '', note: '', cost: '' });
  };

  const handleEditSave = async (item: InventoryItem) => {
    setIsRowSaving(true);
    const token = await getAuthToken();
    if (!token) return;
    const response = await fetch(`/api/inventory/${item.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        size: editValues.size,
        condition: editValues.condition,
        note: editValues.note === '' ? null : editValues.note,
        cost: parseFloat(editValues.cost),
      }),
    });
    if (response.ok) {
      mutate();
      setEditingRowId(null);
      setEditValues({ size: '', condition: '', note: '', cost: '' });
    }
    setIsRowSaving(false);
  };

  const handleAddInventorySuccess = () => {
    // Refresh the inventory data
    mutate();
  };

  // Fetch stores for transfer modal
  useEffect(() => {
    const fetchStores = async () => {
      try {
        const token = await getAuthToken();
        if (!token) return;

        const response = await fetch('/api/stores', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setStores(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        console.error('Failed to fetch stores:', error);
      }
    };

    fetchStores();
  }, [getAuthToken]);

  const handleTransferToStore = async (transferData: {
    items: Array<{ inventoryItemId: string; transferCost: number; storeSku?: string }>;
    storeId: string;
    notes?: string;
  }) => {
    setIsTransferring(true);
    try {
      const token = await getAuthToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Process each item individually for now (API might need to be updated for batch processing)
      for (const item of transferData.items) {
        const response = await fetch('/api/transfers/warehouse-to-store', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            inventoryItemId: item.inventoryItemId,
            storeId: transferData.storeId,
            transferCost: item.transferCost,
            storeSku: item.storeSku,
            notes: transferData.notes
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to transfer to store');
        }
      }

      // Refresh inventory data
      mutate();
      setShowBulkTransferModal(false);
      setSelectedItems(new Set()); // Clear selection after successful transfer
    } catch (error) {
      console.error('Transfer failed:', error);
    } finally {
      setIsTransferring(false);
    }
  };

  const exportToCSV = async () => {
    setIsExporting(true);
    try {
      const token = await getAuthToken();
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      const response = await fetch('/api/inventory/export', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to export inventory');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `inventory-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const toggleDropdown = (itemId: string, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent event bubbling
    
    if (openDropdown === itemId) {
      setOpenDropdown(null);
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    setDropdownPosition({
      x: rect.right - 192, // 192px is the width of the dropdown (w-48)
      y: rect.bottom + 5
    });
    setOpenDropdown(itemId);
  };

  // Checkbox selection functions
  const toggleItemSelection = (itemId: string) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedItems.size === filteredInventory.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filteredInventory.map((item: InventoryItem) => item.id)));
    }
  };

  const getSelectedInventoryItems = () => {
    return filteredInventory.filter((item: InventoryItem) => selectedItems.has(item.id));
  };

  const handleRemoveFromSelection = (itemId: string) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      newSet.delete(itemId);
      return newSet;
    });
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Don't close if clicking on the dropdown itself
      const target = event.target as Element;
      if (target.closest('.dropdown-menu')) {
        return;
      }
      
      if (openDropdown) {
        setOpenDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openDropdown]);

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-muted-foreground">Loading inventory...</div>
        </div>
      </Layout>
    );
  }

  if (isError) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-red-600">Error loading inventory</div>
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
            <button 
              onClick={() => setShowBulkTransferModal(true)}
              disabled={selectedItems.size === 0}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Transfer to Store {selectedItems.size > 0 && `(${selectedItems.size} selected)`}
            </button>
            <button 
              onClick={exportToCSV}
              disabled={isExporting}
              className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isExporting ? 'Exporting...' : 'Export CSV'}
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
                  placeholder="Search by product name, brand, SKU, SL SKU, or size..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
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
                <span>Total Value: ${filteredInventory.reduce((sum: number, item: InventoryItem) => sum + Number(item.cost), 0).toLocaleString()}</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 font-medium text-foreground w-8">
                      <input
                        type="checkbox"
                        checked={selectedItems.size === filteredInventory.length && filteredInventory.length > 0}
                        onChange={toggleSelectAll}
                        className="h-4 w-4 text-primary focus:ring-primary border-input rounded"
                      />
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-foreground">SL SKU</th>
                    <th className="text-left py-3 px-4 font-medium text-foreground w-80">Product</th>
                    <th className="text-left py-3 px-4 font-medium text-foreground">SKU</th>
                    <th className="text-left py-3 px-4 font-medium text-foreground">Size</th>
                    <th className="text-left py-3 px-4 font-medium text-foreground">Condition</th>
                    <th className="text-left py-3 px-4 font-medium text-foreground">Note</th>
                    <th className="text-left py-3 px-4 font-medium text-foreground">Cost</th>
                    <th className="text-left py-3 px-4 font-medium text-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInventory.map((item: InventoryItem) => (
                    <tr key={item.id} className="border-b border-muted hover:bg-accent">
                      <td className="py-3 px-4">
                        <input
                          type="checkbox"
                          checked={selectedItems.has(item.id)}
                          onChange={() => toggleItemSelection(item.id)}
                          className="h-4 w-4 text-primary focus:ring-primary border-input rounded"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono text-sm text-blue-600">{item.stocklabSku || 'N/A'}</span>
                      </td>
                      <td className="py-3 px-4 w-80">
                        <div>
                          <p className="font-medium text-foreground">{item.product?.brand}</p>
                          <p className="font-medium text-foreground">{item.product?.name}</p>
                          <p className="font-medium text-foreground">{item.product?.sku}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono text-sm">{item.sku}</span>
                      </td>
                      <td className="py-3 px-4">
                        {editingRowId === item.id ? (
                          <input
                            type="text"
                            name="size"
                            value={editValues.size}
                            onChange={handleEditChange}
                            className="w-20 px-2 py-1 border rounded"
                          />
                        ) : (
                          <span className="text-foreground">{item.size}</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {editingRowId === item.id ? (
                          <select
                            name="condition"
                            value={editValues.condition}
                            onChange={handleEditChange}
                            className="w-24 px-2 py-1 border rounded"
                          >
                            <option value="NEW">New</option>
                            <option value="PRE_OWNED">Pre-owned</option>
                            <option value="DAMAGED">Damaged</option>
                          </select>
                        ) : (
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getConditionColor(item.condition)}`}> 
                            {item.condition === 'NEW' ? 'New' : item.condition === 'PRE_OWNED' ? 'Pre-owned' : item.condition}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {editingRowId === item.id ? (
                          <select
                            name="note"
                            value={['', 'DMG_BOX', 'NO_BOX', 'REP_BOX', 'FLAWED'].includes(editValues.note) ? editValues.note : ''}
                            onChange={handleEditChange}
                            className="w-28 px-2 py-1 border rounded"
                          >
                            <option value=""></option>
                            <option value="DMG_BOX">DMG Box</option>
                            <option value="NO_BOX">No Box</option>
                            <option value="REP_BOX">REP Box</option>
                            <option value="FLAWED">Flawed</option>
                          </select>
                        ) : (
                          item.note ? (
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getNoteBadgeStyle(item.note)}`}>
                              {getNoteBadgeLabel(item.note)}
                            </span>
                          ) : null
                        )}
                      </td>
                      <td className="py-3 px-4">
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
                          <span className="font-medium text-foreground">${item.cost.toLocaleString()}</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {editingRowId === item.id ? (
                          <div className="flex gap-2 justify-end">
                            <button
                              className="px-2 py-1 bg-primary text-white rounded flex items-center justify-center"
                              onClick={() => handleEditSave(item)}
                              disabled={isRowSaving}
                            >
                              {isRowSaving ? (
                                <svg className="animate-spin h-4 w-4 mr-2 text-white" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                                </svg>
                              ) : null}
                              {isRowSaving ? 'Saving...' : 'Save'}
                            </button>
                            <button
                              className="px-2 py-1 bg-gray-300 text-gray-800 rounded"
                              onClick={handleEditCancel}
                              disabled={isRowSaving}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={(e) => toggleDropdown(item.id, e)}
                            className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
                          >
                            <MoreIcon />
                          </button>
                        )}
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
                    const item = filteredInventory.find((item: InventoryItem) => item.id === openDropdown);
                    if (item) handleEditClick(item);
                    setOpenDropdown(null);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 flex items-center gap-2"
                >
                  <EditIcon />
                  Edit
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const item = filteredInventory.find((item: InventoryItem) => item.id === openDropdown);
                    if (item) handleDeleteItem(item);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                >
                  <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete Item
                </button>
              </div>
            </div>
          </>
        )}

        {/* Add Inventory Modal */}
        {/* <AddInventoryModal
          isOpen={showAddInventoryModal}
          onClose={() => setShowAddInventoryModal(false)}
          onSuccess={handleAddInventorySuccess}
        /> */}



        {/* Bulk Transfer Modal */}
        <BulkTransferModal
          isOpen={showBulkTransferModal}
          onClose={() => setShowBulkTransferModal(false)}
          onSubmit={handleTransferToStore}
          onRemoveItem={handleRemoveFromSelection}
          isLoading={isTransferring}
          selectedItems={getSelectedInventoryItems()}
          stores={stores}
        />

        {/* Delete Confirmation Modal */}
        <PromptModal
          show={showDeleteModal}
          title="Delete Inventory Item"
          onClose={() => {
            setShowDeleteModal(false);
            setSelectedItemToDelete(null);
          }}
        >
          <div className="space-y-4">
            <p>
              Are you sure you want to delete this inventory item? This action cannot be undone.
              {selectedItemToDelete && (
                <span className="block mt-2 text-sm text-muted-foreground">
                  Item: {selectedItemToDelete.product?.brand} {selectedItemToDelete.product?.name} - {selectedItemToDelete.sku}
                </span>
              )}
            </p>
            <div className="flex justify-end space-x-3">
              <button
                className="px-4 py-2 rounded bg-gray-200 text-gray-800 hover:bg-gray-300"
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedItemToDelete(null);
                }}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                onClick={confirmDeleteItem}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </PromptModal>

        {/* Toast */}
        {toast && (
          <Toast
            type={toast.type}
            message={toast.message}
            isVisible={true}
            onClose={() => setToast(null)}
          />
        )}
      </div>
    </Layout>
  );
} 
