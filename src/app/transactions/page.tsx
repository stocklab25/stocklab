'use client';

import React, { useState } from 'react';
import Layout from '@/components/Layout';
import { Card } from '@/components/Card';
import { useTransactions, useProducts } from '@/hooks';
import useAddTransaction from '@/hooks/useAddTransaction';
import { useDeleteTransaction } from '@/hooks/useDeleteTransaction';
import AddTransactionModal from '@/components/AddTransactionModal';
import PromptModal from '@/components/PromptModal';
import Toast from '@/components/Toast';
import { PageLoader } from '@/components/Loader';
import { Table } from '@/components/Table';
import Badge from '@/components/Badge';
import Button from '@/components/Button';
import Modal from '@/components/Modal';
import { format } from 'date-fns';

interface Product {
  id: string;
  brand: string;
  name: string;
  color?: string;
  style?: string;
  quantity: number;
}

interface InventoryItem {
  id: string;
  productId: string;
  sku: string;
  size: string;
  condition: string;
  cost: number;
  status: string;
  location?: string;
  consigner: string;
  product?: Product;
}

interface StockTransaction {
  id: string;
  productId: string;
  type: string;
  quantity: number;
  date: string;
  toLocation?: string;
  fromLocation?: string;
  userId?: string;
  notes?: string;
  product?: {
    id: string;
    brand: string;
    name: string;
    sku: string;
    color?: string;
    quantity: number;
  };
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

export default function Transactions() {
  const { data: transactions, isLoading, isError, mutate } = useTransactions();
  const { data: products } = useProducts();
  const { addTransaction, isLoading: isAdding } = useAddTransaction();
  const { archiveTransaction, hardDeleteTransaction, loading } = useDeleteTransaction({
    onSuccess: () => {
      mutate();
      setToast({ type: 'success', message: 'Transaction updated successfully' });
    },
    onError: (error) => {
      setToast({ type: 'error', message: error });
    }
  });
  
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<StockTransaction | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ x: 0, y: 0 });

  const filteredTransactions = transactions.filter((txn: StockTransaction) => {
    const matchesSearch = 
      txn.product?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      txn.product?.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      txn.product?.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      txn.user?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = typeFilter === '' || txn.type.toLowerCase() === typeFilter;
    
    return matchesSearch && matchesType;
  });

  const getTransactionIcon = (type: string) => {
    switch (type.toLowerCase()) {
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
    switch (type.toLowerCase()) {
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

  const handleArchive = (transaction: StockTransaction) => {
    setSelectedTransaction(transaction);
    setShowArchiveModal(true);
    setOpenDropdown(null);
  };

  const handleDelete = (transaction: StockTransaction) => {
    setSelectedTransaction(transaction);
    setShowDeleteModal(true);
    setOpenDropdown(null);
  };

  const confirmArchive = async () => {
    if (selectedTransaction) {
      try {
        await archiveTransaction(selectedTransaction.id);
        setShowArchiveModal(false);
        setSelectedTransaction(null);
      } catch (error) {
        // Error is handled by the hook
      }
    }
  };

  const confirmDelete = async () => {
    if (selectedTransaction) {
      try {
        await hardDeleteTransaction(selectedTransaction.id);
        setShowDeleteModal(false);
        setSelectedTransaction(null);
      } catch (error) {
        // Error is handled by the hook
      }
    }
  };

  const getProductName = (productId: string) => {
    const product = products?.find((p: any) => p.id === productId);
    return product ? product.name : 'Unknown Product';
  };

  const getProductSku = (productId: string) => {
    const product = products?.find((p: any) => p.id === productId);
    return product ? product.sku : 'Unknown SKU';
  };

  const toggleDropdown = (transactionId: string, event: React.MouseEvent) => {
    if (openDropdown === transactionId) {
      setOpenDropdown(null);
      setSelectedTransaction(null);
    } else {
      const rect = event.currentTarget.getBoundingClientRect();
      setDropdownPosition({
        x: rect.right - 192, // 192px is the width of the dropdown (w-48)
        y: rect.bottom + 8
      });
      setOpenDropdown(transactionId);
      const transaction = transactions.find((t: any) => t.id === transactionId);
      setSelectedTransaction(transaction || null);
    }
  };

  const columns = [
    { key: 'date', label: 'Date' },
    { key: 'product', label: 'Product' },
    { key: 'sku', label: 'SKU' },
    { key: 'type', label: 'Type' },
    { key: 'quantity', label: 'Quantity' },
    { key: 'notes', label: 'Notes' },
    { key: 'actions', label: 'Actions' }
  ];

  const rows = filteredTransactions.map((txn: StockTransaction) => ({
    id: txn.id,
    date: formatDate(txn.date),
    product: getProductName(txn.productId),
    sku: getProductSku(txn.productId),
    type: (
      <Badge 
        variant={txn.type === 'IN' ? 'default' : txn.type === 'OUT' ? 'destructive' : 'secondary'}
      >
        {txn.type.charAt(0).toUpperCase() + txn.type.slice(1).toLowerCase()}
      </Badge>
    ),
    quantity: txn.quantity,
    notes: txn.notes || '-',
    actions: (
      <div className="relative">
        <button
          onClick={(e) => toggleDropdown(txn.id, e)}
          className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors"
          disabled={loading}
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
          </svg>
        </button>
      </div>
    )
  }));

  if (isLoading) {
    return (
      <Layout>
        <PageLoader />
      </Layout>
    );
  }

  if (isError) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center space-y-4">
            <div className="text-6xl">⚠️</div>
            <div className="text-lg text-red-600">Error loading transactions</div>
            <p className="text-muted-foreground">Please try refreshing the page</p>
          </div>
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
          <button 
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
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
                <option value="move">Move</option>
                <option value="adjustment">Adjustment</option>
                <option value="audit">Audit</option>
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

            <div className="overflow-x-auto relative">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    {columns.map((column) => (
                      <th key={column.key} className="text-left py-3 px-4 font-medium text-foreground">
                        {column.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.length > 0 ? (
                    rows.map((row: any) => (
                      <tr key={row.id} className="border-b border-muted hover:bg-accent">
                        <td className="py-3 px-4">{row.date}</td>
                        <td className="py-3 px-4">{row.product}</td>
                        <td className="py-3 px-4">{row.sku}</td>
                        <td className="py-3 px-4">{row.type}</td>
                        <td className="py-3 px-4">{row.quantity}</td>
                        <td className="py-3 px-4">{row.notes}</td>
                        <td className="py-3 px-4">{row.actions}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-8 text-center">
                        <p className="text-muted-foreground">No transactions found</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      </div>

      {/* Add Transaction Modal */}
      <AddTransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={addTransaction}
        isLoading={isAdding}
        products={products || []}
      />

      {/* Archive Confirmation Modal */}
      <Modal
        open={showArchiveModal}
        onClose={() => setShowArchiveModal(false)}
      >
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Archive Transaction</h2>
          <p>
            Are you sure you want to archive this transaction? 
            This will hide it from the main view but preserve the data.
          </p>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setShowArchiveModal(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={confirmArchive}
              disabled={loading}
            >
              Archive
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <PromptModal
        show={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Transaction"
      >
        <div className="space-y-4">
          <p>Are you sure you want to permanently delete this transaction? This action cannot be undone.</p>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setShowDeleteModal(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={loading}
            >
              Delete
            </Button>
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

      {/* Dropdown Menu - Positioned outside table */}
      {openDropdown && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setOpenDropdown(null)}
          />
          <div 
            className="fixed z-50 bg-white rounded-md shadow-lg border border-gray-200 w-48"
            style={{
              left: `${dropdownPosition.x}px`,
              top: `${dropdownPosition.y}px`
            }}
          >
            <div className="py-1">
              <button
                onClick={() => handleArchive(selectedTransaction!)}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                disabled={loading}
              >
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-14 0h14" />
                </svg>
                Archive
              </button>
              <button
                onClick={() => handleDelete(selectedTransaction!)}
                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                disabled={loading}
              >
                <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete
              </button>
            </div>
          </div>
        </>
      )}
    </Layout>
  );
} 