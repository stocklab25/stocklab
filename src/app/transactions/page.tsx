'use client';

import React, { useState } from 'react';
import Layout from '@/components/Layout';
import { Card } from '@/components/Card';
import { useTransactions, useImportTransactions } from '@/hooks';
import { useInventory } from '@/hooks';
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
import { TRANSACTION_TYPE } from '@/utils/constants';
import { StockInIcon, StockOutIcon, ReturnIcon, MoveIcon, MoreIcon, WarningIcon, ArchiveIcon, DeleteIcon } from '@/utils/icons';

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
  product?: Product;
}

interface StockTransaction {
  id: string;
  inventoryItemId: string;
  type: string;
  quantity: number;
  date: string;
  fromStoreId?: string;
  toStoreId?: string;
  userId?: string;
  notes?: string;
  InventoryItem?: {
    id: string;
    sku: string;
    stocklabSku?: string;
  product?: {
    id: string;
    brand: string;
    name: string;
    sku: string;
    color?: string;
    quantity: number;
    };
  };
  user?: {
    id: string;
    name: string;
    email: string;
  };
  fromStore?: {
    id: string;
    name: string;
  };
  toStore?: {
    id: string;
    name: string;
  };
}

export default function Transactions() {
  const { data: transactions, isLoading, isError, mutate } = useTransactions();
  const { data: inventoryItems } = useInventory();
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
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 20;
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importResults, setImportResults] = useState<any>(null);
  const { importTransactions, isLoading: isImporting, error: importError } = useImportTransactions();

  const filteredTransactions = transactions.filter((txn: StockTransaction) => {
    const matchesSearch = 
      txn.InventoryItem?.product?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      txn.InventoryItem?.product?.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      txn.InventoryItem?.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (txn.InventoryItem?.stocklabSku && txn.InventoryItem.stocklabSku.toLowerCase().includes(searchTerm.toLowerCase())) ||
      txn.user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getStoreName(txn).toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = typeFilter === '' || txn.type.toLowerCase() === typeFilter;
    
    return matchesSearch && matchesType;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredTransactions.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedTransactions = filteredTransactions.slice(startIndex, endIndex);

  const getTransactionIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'in':
        return <StockInIcon />;
      case 'out':
        return <StockOutIcon />;
      case 'return':
        return <ReturnIcon />;
      default:
        return <MoveIcon />;
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

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setImportResults(null);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) return;

    try {
      const results = await importTransactions(selectedFile);
      setImportResults(results);
      if (results.errors.length === 0) {
        setIsImportModalOpen(false);
        setSelectedFile(null);
        mutate(); // Refresh transactions list
      }
    } catch (error) {
      
    }
  };

  const getStoreName = (txn: StockTransaction) => {
    // For OUT transactions, show the destination store
    if (txn.type === 'OUT' && txn.toStore) {
      return txn.toStore.name;
    }
    // For IN transactions, show the source store
    if (txn.type === 'IN' && txn.fromStore) {
      return txn.fromStore.name;
    }
    // For transfer transactions
    if (txn.type === 'TRANSFER_TO_STORE' && txn.toStore) {
      return txn.toStore.name;
    }
    if (txn.type === 'TRANSFER_FROM_STORE' && txn.fromStore) {
      return txn.fromStore.name;
    }
    // Default to Warehouse if no store is specified
    return 'Warehouse';
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
    { key: 'stocklabSku', label: 'SL SKU' },
    { key: 'product', label: 'Product' },
    { key: 'sku', label: 'SKU' },
    { key: 'type', label: 'Type' },
    { key: 'store', label: 'Store' },
    { key: 'notes', label: 'Notes' },
    { key: 'actions', label: 'Actions' }
  ];

  const rows = paginatedTransactions.map((txn: any) => ({
    id: txn.id,
    date: formatDate(txn.date),
    product: txn.InventoryItem?.product?.name || 'Unknown Product',
    stocklabSku: txn.InventoryItem?.stocklabSku || 'N/A',
    sku: txn.InventoryItem?.sku || 'Unknown SKU',
    type: (
      <Badge 
        variant={txn.type === 'IN' ? 'default' : txn.type === 'OUT' ? 'destructive' : 'secondary'}
      >
        {TRANSACTION_TYPE[txn.type as keyof typeof TRANSACTION_TYPE] || txn.type}
      </Badge>
    ),
    store: getStoreName(txn),
    notes: txn.notes || '-',
    actions: (
      <div className="relative">
        <button
          onClick={(e) => toggleDropdown(txn.id, e)}
          className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors"
          disabled={loading}
        >
          <MoreIcon />
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
            <div className="text-6xl"><WarningIcon /></div>
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
          <div className="flex space-x-2">
            <Button onClick={() => setIsImportModalOpen(true)}>
              <span className="mr-2"></span>
              Import Transactions
            </Button>
            <Button onClick={() => setIsModalOpen(true)}>
              <span className="mr-2">+</span>
              New Transaction
            </Button>
          </div>
        </div>

        {/* Search and Filters */}
        <Card>
          <div className="p-6">
            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Search by product name, brand, SKU, SL SKU, or user..."
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
                <span>Page {currentPage} of {totalPages} • Showing {paginatedTransactions.length} of {filteredTransactions.length} transactions</span>
              </div>
            </div>

            <div className="overflow-x-auto relative">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    {columns.map((column) => {
                      // Add specific width class for product column
                      let widthClass = '';
                      if (column.key === 'product') {
                        widthClass = 'w-80';
                      }
                      return (
                        <th key={column.key} className={`text-left py-3 px-4 font-medium text-foreground ${widthClass}`}>
                        {column.label}
                      </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {rows.length > 0 ? (
                    rows.map((row: any) => (
                      <tr key={row.id} className="border-b border-muted hover:bg-accent">
                        <td className="py-2 px-4 text-sm">{row.date}</td>
                        <td className="py-2 px-4 text-sm font-mono text-blue-600">{row.stocklabSku}</td>
                        <td className="py-2 px-4 text-sm w-80">{row.product}</td>
                        <td className="py-2 px-4 text-sm">{row.sku}</td>
                        <td className="py-2 px-4 text-sm">{row.type}</td>
                        <td className="py-2 px-4 text-sm">{row.store}</td>
                        <td className="py-2 px-4 text-sm">{row.notes}</td>
                        <td className="py-2 px-4 text-sm">{row.actions}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={9} className="py-8 text-center">
                        <p className="text-muted-foreground">No transactions found</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                <div className="text-sm text-muted-foreground">
                  Showing {startIndex + 1} to {Math.min(endIndex, filteredTransactions.length)} of {filteredTransactions.length} transactions
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 text-sm border border-input rounded-md hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 text-sm border border-input rounded-md hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Add Transaction Modal */}
      <AddTransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={addTransaction}
        isLoading={isAdding}
        inventoryItems={inventoryItems || []}
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

      {/* Import Transactions Modal */}
      {isImportModalOpen && (
        <Modal open={isImportModalOpen} onClose={() => setIsImportModalOpen(false)}>
          <div className="space-y-4">
            <h2 className="text-xl font-bold mb-2">Import Transactions from CSV</h2>
            <p className="text-muted-foreground text-sm mb-2">
              Upload a CSV file with transaction details. Note: Stock IN transactions are handled through the Inventory system. You can download a template below.
            </p>
            <a
              href="/import-transactions-template.csv"
              download
              className="inline-block mb-2 text-blue-600 hover:underline text-sm"
            >
              Download CSV Template
            </a>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="block w-full text-sm text-gray-700 border border-gray-300 rounded-lg cursor-pointer focus:outline-none"
            />
            {selectedFile && (
              <p className="text-sm text-green-600">Selected: {selectedFile.name}</p>
            )}
            {importError && (
              <p className="text-sm text-red-600">Error: {importError}</p>
            )}
            {importResults && (
              <div className="bg-gray-50 p-3 rounded-lg">
                <h3 className="font-semibold mb-2">Import Results:</h3>
                <ul className="text-sm space-y-1">
                  <li>Transactions created: {importResults.transactionsCreated}</li>
                </ul>
                {importResults.errors.length > 0 && (
                  <div className="mt-2">
                    <h4 className="font-semibold text-red-600">Errors:</h4>
                    <ul className="text-sm text-red-600 space-y-1">
                      {importResults.errors.map((error: string, index: number) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
            <div className="flex justify-end space-x-2 mt-4">
              <button
                className="px-4 py-2 rounded bg-gray-200 text-gray-800 hover:bg-gray-300"
                onClick={() => {
                  setIsImportModalOpen(false);
                  setSelectedFile(null);
                  setImportResults(null);
                }}
                disabled={isImporting}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                onClick={handleImport}
                disabled={!selectedFile || isImporting}
              >
                {isImporting ? 'Importing...' : 'Import'}
              </button>
            </div>
          </div>
        </Modal>
      )}

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
                <ArchiveIcon />
                Archive
              </button>
              <button
                onClick={() => handleDelete(selectedTransaction!)}
                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                disabled={loading}
              >
                <DeleteIcon />
                Delete
              </button>
            </div>
          </div>
        </>
      )}
    </Layout>
  );
} 
