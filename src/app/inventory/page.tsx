'use client';

import { useState, useRef, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Card } from '@/components/Card';
import { EditModal } from '@/components/EditModal';
import AddInventoryModal from '@/components/AddInventoryModal';
import EditInventoryModal from '@/components/EditInventoryModal';
import { useInventory, useUpdateInventoryQuantity } from '@/hooks';
import { useSettings } from '@/contexts/SettingsContext';

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
  size: string;
  condition: string;
  cost: number;
  status: string;
  quantity: number;
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
  const { updateQuantity, isLoading: isUpdating } = useUpdateInventoryQuantity();
  const { settings } = useSettings();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ x: 0, y: 0 });
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [showAddInventoryModal, setShowAddInventoryModal] = useState(false);
  const [showEditInventoryModal, setShowEditInventoryModal] = useState(false);
  const [selectedInventoryItem, setSelectedInventoryItem] = useState<InventoryItem | null>(null);



  const getDynamicStatus = (quantity: number) => {
    if (quantity === 0) {
      return 'Out of Stock';
    } else if (quantity <= settings.lowStockThreshold) {
      return 'Low Stock';
    } else {
      return 'In Stock';
    }
  };

  const filteredInventory = inventory.filter((item: InventoryItem) => {
    const matchesSearch = 
      item.product?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.product?.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.size.toLowerCase().includes(searchTerm.toLowerCase());
    
    const dynamicStatus = getDynamicStatus(item.quantity);
    const matchesStatus = statusFilter === '' || dynamicStatus === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (quantity: number) => {
    if (quantity === 0) {
      return 'bg-red-100 text-red-800';
    } else if (quantity <= settings.lowStockThreshold) {
      return 'bg-yellow-100 text-yellow-800';
    } else {
        return 'bg-green-100 text-green-800';
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

  const handleEditQuantity = (item: InventoryItem) => {
    setSelectedItem(item);
    setEditModalOpen(true);
    setOpenDropdown(null);
  };

  const handleEditInventory = (item: InventoryItem) => {
    setSelectedInventoryItem(item);
    setShowEditInventoryModal(true);
    setOpenDropdown(null);
  };

  const handleAddInventorySuccess = () => {
    // Refresh the inventory data
    mutate();
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
              onClick={() => setShowAddInventoryModal(true)}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              📥 Stock In
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
                  placeholder="Search by product name, brand, SKU, or size..."
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
                <option value="In Stock">In Stock</option>
                <option value="Low Stock">Low Stock</option>
                <option value="Out of Stock">Out of Stock</option>
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
                <span>Total Value: ${filteredInventory.reduce((sum: number, item: InventoryItem) => sum + Number(item.cost), 0).toLocaleString()}</span>
              </div>
            </div>

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
                    <th className="text-left py-3 px-4 font-medium text-foreground">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-foreground">Quantity</th>
                    <th className="text-left py-3 px-4 font-medium text-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInventory.map((item: InventoryItem) => (
                    <tr key={item.id} className="border-b border-muted hover:bg-accent">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium text-foreground">{item.product?.brand}</p>
                          <p className="text-sm text-muted-foreground">{item.product?.name}</p>
                          <p className="text-xs text-muted-foreground">{item.product?.sku}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono text-sm">{item.sku}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono text-sm flex justify-center">{item.quantity}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-foreground">{item.size}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getConditionColor(item.condition)}`}>
                          {item.condition}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-medium text-foreground">${item.cost.toLocaleString()}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(item.quantity)}`}>
                          {getDynamicStatus(item.quantity)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-muted-foreground">{item.quantity}</span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={(e) => toggleDropdown(item.id, e)}
                          className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                          </svg>
                        </button>
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

        {/* Edit Quantity Modal */}
        <EditModal
          isOpen={editModalOpen}
          onClose={() => {
            setEditModalOpen(false);
            setSelectedItem(null);
          }}
          onSave={async (data) => {
            if (selectedItem) {
              await updateQuantity(selectedItem.id, { quantity: Number(data.quantity) });
            }
          }}
          title={`Edit Quantity - ${selectedItem ? `${selectedItem.product?.brand} ${selectedItem.product?.name}` : ''}`}
          fields={[
            {
              name: 'quantity',
              label: 'Quantity',
              type: 'number',
              value: selectedItem?.quantity ?? 0,
              placeholder: 'Enter quantity',
              min: 0,
              required: true,
            }
          ]}
          isLoading={isUpdating}
        />

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
                    if (item) handleEditInventory(item);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 flex items-center gap-2"
                >
                  <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const item = filteredInventory.find((item: InventoryItem) => item.id === openDropdown);
                    if (item) handleEditQuantity(item);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-green-600 hover:bg-green-50 flex items-center gap-2"
                  disabled={isUpdating}
                >
                  <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Edit Quantity
                </button>
              </div>
            </div>
          </>
        )}

        {/* Add Inventory Modal */}
        <AddInventoryModal
          isOpen={showAddInventoryModal}
          onClose={() => setShowAddInventoryModal(false)}
          onSuccess={handleAddInventorySuccess}
        />

        {/* Edit Inventory Modal */}
        <EditInventoryModal
          isOpen={showEditInventoryModal}
          onClose={() => setShowEditInventoryModal(false)}
          onSuccess={handleAddInventorySuccess}
          inventoryItem={selectedInventoryItem}
        />
      </div>
    </Layout>
  );
} 
