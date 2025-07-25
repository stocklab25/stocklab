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
  const { addSale, isLoading: isAdding } = useAddSale(
    () => {
      setIsModalOpen(false);
      mutate();
    },
    (err) => setModalError(err)
  );
  const { formatCurrency } = useCurrency();
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{ cost: string; payout: string; quantity: string; notes: string; discount: string }>({ cost: '', payout: '', quantity: '', notes: '', discount: '' });
  const [isRowSaving, setIsRowSaving] = useState(false);
  const [deletingRowId, setDeletingRowId] = useState<string | null>(null);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{ show: boolean; row: any | null }>({ show: false, row: null });

  const handleEditClick = (row: any, sale: any) => {
    setEditingRowId(row.id);
    setEditValues({
      cost: (sale.cost || '').toString(),
      payout: (sale.payout || '').toString(),
      quantity: (sale.quantity || '').toString(),
      notes: sale.notes || '',
      discount: (sale.discount || '').toString(),
    });
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setEditValues({ ...editValues, [e.target.name]: e.target.value });
  };

  const handleEditCancel = () => {
    setEditingRowId(null);
    setEditValues({ cost: '', payout: '', quantity: '', notes: '', discount: '' });
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
      }),
    });
    if (response.ok) {
      mutate();
      setEditingRowId(null);
      setEditValues({ cost: '', payout: '', quantity: '', notes: '', discount: '' });
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
        console.log('Sale deleted successfully');
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

  // Filter sales based on selected store
  const filteredSales = storeFilter === 'all' 
    ? sales 
    : sales.filter((sale: any) => sale.store?.id === storeFilter);



  const columns = [
    { key: "orderNumber", label: "Order #" },
    { key: "store", label: "Store" },
    { key: "stocklabSku", label: "SL SKU" },
    { key: "brand", label: "Brand" },
    { key: "productName", label: "Product" },
    { key: "size", label: "Size" },
    { key: "condition", label: "Condition" },
    { key: "sku", label: "SKU" },
    { key: "quantity", label: "Qty" },
    { key: "cost", label: "Cost" },
    { key: "payout", label: "Payout" },
    { key: "discount", label: "Discount" },
    { key: "profit", label: "Profit" },
    { key: "profitMargin", label: "Profit Margin" },
    { key: "saleDate", label: "Sale Date" },
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
      orderNumber: sale.orderNumber,
      store: sale.store?.name || "-",
      brand: product.brand || "-",
      productName: product.name || "-",
      color: product.color || "-",
      size: sale.inventoryItem?.size || "-",
      condition: sale.inventoryItem?.condition || "-",
      sku: sale.inventoryItem?.sku || "-",
      stocklabSku: sale.inventoryItem?.stocklabSku || "-",
      quantity: sale.quantity,
      cost: formatCurrency(cost),
      payout: formatCurrency(payout),
      discount: discount > 0 ? formatCurrency(discount) : "-",
      profit: formatCurrency(profit),
      profitMargin,
      saleDate: new Date(sale.saleDate).toLocaleDateString(),
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
            <div className="flex items-center space-x-4">
              <div className="w-1/4">
                <label className="block text-sm font-medium text-foreground mb-2">
                  Filter by Store
                </label>
                <select
                  value={storeFilter}
                  onChange={(e) => setStoreFilter(e.target.value)}
                  className="w-full px-4 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="all">All Stores</option>
                  {stores.map((store) => (
                    <option key={store.id} value={store.id}>
                      {store.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex-1"></div>
              <div className="text-sm text-muted-foreground">
                Showing {rows.length} of {sales.length} sales
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
                <Table className="w-full min-w-max">
                  <TableHeader>
                    <TableRow>
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
                            {columns.map((col) => {
                              if (editingRowId === row.id && ['cost', 'payout', 'quantity', 'notes', 'discount'].includes(col.key)) {
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
                                      value={editValues[col.key as 'cost' | 'payout' | 'quantity' | 'discount']}
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
                        <TableCell colSpan={columns.length} className="text-center py-8">
                          {storeFilter === 'all' ? 'No sales found' : 'No sales found for selected store'}
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
