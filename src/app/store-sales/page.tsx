"use client";

import React, { useState, useCallback, useEffect } from "react";
import Layout from "@/components/Layout";
import { Card } from "@/components/Card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/Table";
import Button from '@/components/Button';
import useSWR from "swr";
import AddSaleModal from '@/components/AddSaleModal';
import ImportSalesModal from '@/components/ImportSalesModal';
import PromptModal from '@/components/PromptModal';
import { useStores } from '@/hooks/useStores';
import { useStoreInventory } from '@/hooks/useStoreInventory';
import { useAddSale } from '@/hooks/useAddSale';
import { useSales } from '@/hooks/useSales';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useAuth } from '@/contexts/AuthContext';

export default function StoreSalesPage() {
  const { getAuthToken } = useAuth();
  const { data: sales, isLoading, mutate } = useSales();
  const { data: stores, isLoading: storesLoading } = useStores();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [storeFilter, setStoreFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const { addSale, isLoading: isAdding } = useAddSale(
    () => {
      setIsModalOpen(false);
      mutate();
    },
    (err) => setModalError(err)
  );
  const { formatCurrency } = useCurrency();
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{ cost: string; payout: string; quantity: string; notes: string; discount: string; payoutMethod: string }>({ cost: '', payout: '', quantity: '', notes: '', discount: '', payoutMethod: '' });
  const [isRowSaving, setIsRowSaving] = useState(false);
  const [deletingRowId, setDeletingRowId] = useState<string | null>(null);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{ show: boolean; row: any | null }>({ show: false, row: null });
  
  // Row selection states for bulk refund
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isBulkRefunding, setIsBulkRefunding] = useState(false);

  const handleEditClick = (row: any, sale: any) => {
    setEditingRowId(row.id);
    setEditValues({
      cost: (sale.cost || '').toString(),
      payout: (sale.payout || '').toString(),
      quantity: (sale.quantity || '').toString(),
      notes: sale.notes || '',
      discount: (sale.discount || '').toString(),
      payoutMethod: sale.payoutMethod || '',
    });
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setEditValues({ ...editValues, [e.target.name]: e.target.value });
  };

  const handleEditCancel = () => {
    setEditingRowId(null);
    setEditValues({ cost: '', payout: '', quantity: '', notes: '', discount: '', payoutMethod: '' });
  };

  const handleEditSave = async (row: any) => {
    setIsRowSaving(true);
    const token = await getAuthToken();
    if (!token) return;
    const response = await fetch(`/api/sales/${row.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        cost: parseFloat(editValues.cost),
        payout: parseFloat(editValues.payout),
        quantity: parseInt(editValues.quantity, 10),
        notes: editValues.notes,
        discount: parseFloat(editValues.discount),
        payoutMethod: editValues.payoutMethod,
      }),
    });
    if (response.ok) {
      mutate();
      setEditingRowId(null);
      setEditValues({ cost: '', payout: '', quantity: '', notes: '', discount: '', payoutMethod: '' });
    }
    setIsRowSaving(false);
  };

  const handleDelete = async (row: any) => {
    setDeleteConfirmModal({ show: true, row });
  };

  const confirmDelete = async () => {
    const row = deleteConfirmModal.row;
    if (!row) return;

    setDeletingRowId(row.id);
    const token = await getAuthToken();
    if (!token) {
      alert('No authentication token found');
      setDeletingRowId(null);
      setDeleteConfirmModal({ show: false, row: null });
      return;
    }
    
    try {
      const response = await fetch(`/api/sales/${row.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        mutate();
      } else {
        const errorData = await response.json();
        console.error('Delete failed:', errorData);
        alert(`Failed to delete sale: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete sale: Network error');
    }
    
    setDeletingRowId(null);
    setDeleteConfirmModal({ show: false, row: null });
  };

  const toggleDropdown = (rowId: string) => {
    setOpenDropdown(openDropdown === rowId ? null : rowId);
  };

  // Row selection functions for bulk refund
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
    if (selectedItems.size === filteredSales.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filteredSales.map((sale: any) => sale.id)));
    }
  };

  const getSelectedSales = () => {
    return filteredSales.filter((sale: any) => selectedItems.has(sale.id));
  };

  const handleBulkRefund = async () => {
    setIsBulkRefunding(true);
    try {
      const token = await getAuthToken();
      if (!token) {
        throw new Error('No authentication token available');
      }

      const selectedSales = getSelectedSales();
      
      // Process each sale for refund
      for (const sale of selectedSales) {
        // 1. Update the sale status to "REFUNDED"
        const updateSaleResponse = await fetch(`/api/sales/${sale.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            status: 'REFUNDED',
          }),
        });

        if (!updateSaleResponse.ok) {
          const errorData = await updateSaleResponse.json();
          console.error('Sale update error:', errorData);
          throw new Error(`Failed to update sale ${sale.id}: ${errorData.error || 'Unknown error'}`);
        }

        // 2. Find and update the existing store inventory item
        // First, get the store inventory to find the correct item
        const storeInventoryResponse = await fetch(`/api/stores/inventory?storeId=${sale.storeId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!storeInventoryResponse.ok) {
          throw new Error(`Failed to fetch store inventory for sale ${sale.id}`);
        }

        const storeInventory = await storeInventoryResponse.json();
        const existingInventoryItem = storeInventory.find((item: any) => 
          item.inventoryItemId === sale.inventoryItemId
        );

        if (existingInventoryItem) {
          // Update the existing store inventory item quantity back to 1 and status to IN_STOCK
          const updateInventoryResponse = await fetch(`/api/stores/${sale.storeId}/inventory`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              id: existingInventoryItem.id,
              quantity: 1,
              status: 'IN_STOCK',
            }),
          });

          if (!updateInventoryResponse.ok) {
            throw new Error(`Failed to update store inventory for sale ${sale.id}`);
          }
        }
      }

      // Refresh data
      mutate();
      
      // Clear selection
      setSelectedItems(new Set());
      
    } catch (error) {
      console.error('Error processing bulk refund:', error);
      alert('Failed to process bulk refund. Please try again.');
    } finally {
      setIsBulkRefunding(false);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openDropdown) {
        const target = event.target as Element;
        // Check if click is outside the dropdown
        const dropdownElement = document.querySelector(`[data-dropdown="${openDropdown}"]`);
        const buttonElement = document.querySelector(`[data-dropdown-button="${openDropdown}"]`);
        
        if (dropdownElement && !dropdownElement.contains(target) && 
            buttonElement && !buttonElement.contains(target)) {
          setOpenDropdown(null);
        }
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [openDropdown]);

  // Fetch inventory for selected store (for modal)
  const fetchInventory = useCallback(async (storeId: string) => {
    const token = await getAuthToken();
    const res = await fetch(`/api/stores/${storeId}/inventory`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    if (!res.ok) throw new Error('Failed to fetch inventory');
    const data = await res.json();
    // Flatten to inventoryItem[]
    return (Array.isArray(data) ? data : []).map((si: any) => ({ ...si.inventoryItem, quantity: si.quantity }));
  }, [getAuthToken]);

  // Filter sales based on selected store, search term, and status
  const filteredSales = (sales || []).filter((sale: any) => {
    // Store filter
    if (storeFilter !== 'all' && sale.store?.id !== storeFilter) {
      return false;
    }
    
    // Status filter
    if (statusFilter !== 'ALL' && sale.status !== statusFilter) {
      return false;
    }
    
    // Search filter
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    const product = sale.inventoryItem?.product || {};
    
    return (
      sale.store?.name?.toLowerCase().includes(searchLower) ||
      sale.inventoryItem?.stocklabSku?.toLowerCase().includes(searchLower) ||
      sale.inventoryItem?.storeSku?.toLowerCase().includes(searchLower) ||
      sale.inventoryItem?.sku?.toLowerCase().includes(searchLower) ||
      product.brand?.toLowerCase().includes(searchLower) ||
      product.name?.toLowerCase().includes(searchLower) ||
      product.sku?.toLowerCase().includes(searchLower) ||
      sale.inventoryItem?.size?.toLowerCase().includes(searchLower) ||
      sale.inventoryItem?.condition?.toLowerCase().includes(searchLower) ||
      sale.notes?.toLowerCase().includes(searchLower)
    );
  });



  const columns = [
    { key: "store", label: "Store" },
    { key: "stocklabSku", label: "SL SKU" },
    { key: "storeSku", label: "Store SKU" },
    { key: "brand", label: "Brand" },
    { key: "productName", label: "Product" },
    { key: "size", label: "Size" },
    { key: "condition", label: "Condition" },
    { key: "sku", label: "SKU" },
    { key: "quantity", label: "Qty" },
    { key: "cost", label: "Cost" },
    { key: "payout", label: "Payout" },
    { key: "discount", label: "Discount" },
    { key: "payoutMethod", label: "Payout Method" },
    { key: "profit", label: "Profit" },
    { key: "profitMargin", label: "Profit Margin" },
    { key: "saleDate", label: "Sale Date" },
    { key: "status", label: "Status" },
    { key: "notes", label: "Notes" },
  ];

  const rows = filteredSales.map((sale: any) => {
    const product = sale.inventoryItem?.product || {};
    const cost = Number(sale.cost) || 0;
    const payout = Number(sale.payout) || 0;
    const discount = Number(sale.discount) || 0;
    const profit = payout - cost - discount;
    const profitMargin = cost > 0 ? ((profit / cost) * 100).toFixed(2) + "%" : "-";

    return {
      id: sale.id,
      store: sale.store?.name || "-",
      brand: product.brand || "-",
      productName: product.name || "-",
      color: product.color || "-",
      size: sale.inventoryItem?.size || "-",
      condition: sale.inventoryItem?.condition || "-",
      sku: sale.inventoryItem?.sku || "-",
      stocklabSku: sale.inventoryItem?.stocklabSku || "-",
      storeSku: sale.inventoryItem?.storeSku || "-",
      quantity: sale.quantity,
      cost: formatCurrency(cost),
      payout: formatCurrency(payout),
      discount: discount > 0 ? formatCurrency(discount) : "-",
      payoutMethod: sale.payoutMethod || "-",
      profit: formatCurrency(profit),
      profitMargin,
      saleDate: new Date(sale.saleDate).toISOString().split('T')[0],
      status: sale.status || "COMPLETED",
      notes: sale.notes || "-",
    };
  });

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Store Sales</h1>
            <p className="text-muted-foreground mt-2">All sales per store</p>
          </div>
          <div className="flex space-x-2">
            <Button onClick={() => setIsImportModalOpen(true)}>
              <span className="mr-2"></span>
              Import Sales
            </Button>
            <Button onClick={() => setIsModalOpen(true)}>
              <span className="mr-2">+</span>
              Add Sale
            </Button>
          </div>
        </div>

        {/* Store Filter */}
        <Card>
          <div className="p-6">
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label htmlFor="search-input" className="block text-sm font-medium mb-1">Search Sales:</label>
                  <input
                    id="search-input"
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by store, SL SKU, store SKU, brand, name, size, condition, or notes..."
                    className="w-full px-4 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                <div>
                  <label htmlFor="status-filter" className="block text-sm font-medium mb-1">Status:</label>
                  <select
                    id="status-filter"
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                    className="px-4 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="ALL">All Status</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="REFUNDED">Refunded</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="store-select" className="block text-sm font-medium mb-1">Select Store:</label>
                  <select
                    id="store-select"
                    value={storeFilter}
                    onChange={(e) => setStoreFilter(e.target.value)}
                    className="px-4 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="all">All Stores</option>
                    {stores.map((store) => (
                      <option key={store.id} value={store.id}>
                        {store.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-6 overflow-x-auto">
            {isLoading ? (
              <div>Loading...</div>
            ) : (
              <div className="overflow-x-auto">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-semibold">
                      {storeFilter === 'all' 
                        ? 'Sales For All Stores' 
                        : `Sales For ${stores.find(s => s.id === storeFilter)?.name}`
                      }
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      Showing {rows.length} of {sales.length} sales
                    </p>
                  </div>
                  {selectedItems.size > 0 && (
                    <Button 
                      onClick={handleBulkRefund}
                      disabled={isBulkRefunding}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {isBulkRefunding ? 'Refunding...' : `Refund to Inventory (${selectedItems.size} selected)`}
                    </Button>
                  )}
                </div>
                <Table className="w-full min-w-max">
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <input
                          type="checkbox"
                          checked={selectedItems.size === filteredSales.length && filteredSales.length > 0}
                          onChange={toggleSelectAll}
                          className="rounded border-gray-300 text-primary focus:ring-primary"
                        />
                      </TableHead>
                      {columns.map((col) => {
                        // Add specific width classes for brand and product columns
                        let widthClass = '';
                        if (col.key === 'brand') {
                          widthClass = 'w-40';
                        } else if (col.key === 'productName') {
                          widthClass = 'w-80';
                        }
                        return (
                          <TableHead key={col.key} className={widthClass}>
                            {col.label}
                          </TableHead>
                        );
                      })}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.length > 0 ? (
                      rows.map((row: any, idx: number) => {
                        const sale = filteredSales[idx];
                        return (
                          <TableRow key={row.id}>
                            <TableCell>
                              <input
                                type="checkbox"
                                checked={selectedItems.has(sale.id)}
                                onChange={() => toggleItemSelection(sale.id)}
                                className="rounded border-gray-300 text-primary focus:ring-primary"
                              />
                            </TableCell>
                            {columns.map((col) => {
                              if (editingRowId === row.id && ['cost', 'payout', 'quantity', 'notes', 'discount', 'payoutMethod'].includes(col.key)) {
                                if (col.key === 'notes') {
                                  return (
                                    <TableCell key={col.key}>
                                      <textarea
                                        name="notes"
                                        value={editValues.notes}
                                        onChange={handleEditChange}
                                        className="w-32 px-2 py-1 border rounded"
                                        rows={1}
                                      />
                                    </TableCell>
                                  );
                                }
                                return (
                                  <TableCell key={col.key}>
                                    <input
                                      type={col.key === 'quantity' ? 'number' : 'text'}
                                      name={col.key}
                                      value={editValues[col.key as 'cost' | 'payout' | 'quantity' | 'discount' | 'payoutMethod']}
                                      onChange={handleEditChange}
                                      className="w-20 px-2 py-1 border rounded"
                                    />
                                  </TableCell>
                                );
                              }
                              // Add specific width classes for brand and product columns
                              let widthClass = '';
                              if (col.key === 'brand') {
                                widthClass = 'w-40';
                              } else if (col.key === 'productName') {
                                widthClass = 'w-80';
                              }
                              
                              // Special rendering for status column
                              if (col.key === 'status') {
                                return (
                                  <TableCell key={col.key} className={widthClass}>
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                      row[col.key] === 'COMPLETED' 
                                        ? 'bg-green-100 text-green-800' 
                                        : 'bg-orange-100 text-orange-800'
                                    }`}>
                                      {row[col.key] === 'COMPLETED' ? 'COMPLETED' : 'REFUNDED'}
                                    </span>
                                  </TableCell>
                                );
                              }
                              
                              return <TableCell key={col.key} className={widthClass}>{row[col.key]}</TableCell>;
                            })}
                            <TableCell>
                              {editingRowId === row.id ? (
                                <div className="flex gap-2">
                                  <button
                                    className="px-2 py-1 bg-primary text-white rounded"
                                    onClick={() => handleEditSave(row)}
                                    disabled={isRowSaving}
                                  >
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
                                <div className="relative">
                                  <button
                                    className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors"
                                    onClick={() => toggleDropdown(row.id)}
                                    data-dropdown-button={row.id}
                                  >
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                      <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                                    </svg>
                                  </button>
                                  
                                  {openDropdown === row.id && (
                                    <div 
                                      className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-50"
                                      data-dropdown={row.id}
                                    >
                                      <div className="py-1">
                                <button
                                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                          onClick={() => {
                                            handleEditClick(row, sale);
                                            setOpenDropdown(null);
                                          }}
                                >
                                  Edit
                                </button>
                                        <button
                                          className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                                          onClick={() => {
                                            handleDelete(row);
                                            setOpenDropdown(null);
                                          }}
                                          disabled={deletingRowId === row.id}
                                        >
                                          {deletingRowId === row.id ? 'Deleting...' : 'Delete'}
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={columns.length + 1} className="text-center py-8">
                          {searchTerm 
                            ? `No sales found matching "${searchTerm}".` 
                            : storeFilter === 'all' 
                              ? 'No sales found' 
                              : 'No sales found for selected store'
                          }
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </Card>
      </div>
      <AddSaleModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setModalError(null); }}
        onSubmit={addSale}
        stores={stores || []}
        fetchInventory={fetchInventory}
        getAuthToken={getAuthToken}
        isLoading={isAdding}
      />
      <ImportSalesModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={() => {
          setIsImportModalOpen(false);
          mutate();
        }}
      />
      <PromptModal
        show={deleteConfirmModal.show}
        title="Confirm Delete"
        onClose={() => setDeleteConfirmModal({ show: false, row: null })}
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            Are you sure you want to delete this sale? This action cannot be undone.
          </p>
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setDeleteConfirmModal({ show: false, row: null })}
              className="px-4 py-2 text-gray-600 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={confirmDelete}
              disabled={deletingRowId === deleteConfirmModal.row?.id}
              className="px-4 py-2 text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {deletingRowId === deleteConfirmModal.row?.id ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </PromptModal>
    </Layout>
  );
} 
