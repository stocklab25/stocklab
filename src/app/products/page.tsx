'use client';

import { useState } from 'react';
import Layout from '@/components/Layout';
import { Card } from '@/components/Card';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useProducts, useAddProduct, useImportProducts } from '@/hooks';
import { useDeleteProduct } from '@/hooks/useDeleteProduct';
import { useRestoreProduct } from '@/hooks/useRestoreProduct';
import { useEditProduct } from '@/hooks/useEditProduct';
import AddProductModal from '@/components/AddProductModal';
import EditProductModal from '@/components/EditProductModal';
import PromptModal from '@/components/PromptModal';
import { PageLoader } from '@/components/Loader';
import Button from '@/components/Button';
import Modal from '@/components/Modal';

interface Product {
  id: string;
  brand: string;
  name: string;
  color?: string;
  sku?: string;
  itemType: 'SHOE' | 'APPAREL' | 'MERCH';
  deletedAt?: string;
}

export default function Products() {
  const [showArchived, setShowArchived] = useState(false);
  const { data: products, isLoading, isError, mutate } = useProducts();
  const { addProduct, isLoading: isAdding } = useAddProduct();
  const { archiveProduct, hardDeleteProduct, loading: isDeleting } = useDeleteProduct({
    onSuccess: () => mutate(),
    onError: (error) => {
      // Handle error silently
    }
  });
  const { restoreProduct, loading: isRestoring } = useRestoreProduct({
    onSuccess: () => mutate(),
    onError: (error) => {
      // Handle error silently
    }
  });
  const { editProduct, loading: isEditing } = useEditProduct({
    onSuccess: () => {
      mutate();
      setIsEditModalOpen(false);
      setProductToEdit(null);
    },
    onError: (error) => {
      // Handle error silently
    }
  });
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [deleteType, setDeleteType] = useState<'archive' | 'hard' | 'force'>('archive');
  const [showForcePrompt, setShowForcePrompt] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ x: 0, y: 0 });
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importResults, setImportResults] = useState<any>(null);
  const { importProducts, isLoading: isImporting, error: importError } = useImportProducts();

  // Filter products based on archived status
  const filteredProducts = products.filter((product: Product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.sku && product.sku.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const isArchived = !!product.deletedAt;
    return matchesSearch && (showArchived ? isArchived : !isArchived);
  });

  const handleAddProduct = async (productData: { brand: string; name: string; color?: string; sku?: string; itemType: 'SHOE' | 'APPAREL' | 'MERCH' }) => {
    try {
      await addProduct(productData);
      setIsModalOpen(false);
    } catch (error) {
      // Handle error silently
    }
  };

  const handleDeletePrompt = (product: Product, type: 'archive' | 'hard' | 'force') => {
    setProductToDelete(product);
    setDeleteType(type);
    setOpenDropdown(null);
    if (type === 'force') {
      setShowForcePrompt(true);
    } else {
      setShowPrompt(true);
    }
  };

  const handleDeleteProduct = async () => {
    if (!productToDelete) return;
    setDeletingId(productToDelete.id);
    
    try {
      if (deleteType === 'hard') {
        await hardDeleteProduct(productToDelete.id);
      } else if (deleteType === 'force') {
        await hardDeleteProduct(productToDelete.id, true);
      } else {
        await archiveProduct(productToDelete.id);
      }
    } catch (error) {
      // Handle error silently
    } finally {
      setDeletingId(null);
      setShowPrompt(false);
      setShowForcePrompt(false);
      setProductToDelete(null);
    }
  };

  const handleRestoreProduct = async (productId: string) => {
    try {
      await restoreProduct(productId);
      setOpenDropdown(null);
    } catch (error) {
      // Handle error silently
    }
  };

  const handleEditProduct = (product: Product) => {
    setProductToEdit(product);
    setIsEditModalOpen(true);
    setOpenDropdown(null);
  };

  const handleEditSubmit = async (productId: string, productData: { brand: string; name: string; color?: string; sku?: string; itemType: 'SHOE' | 'APPAREL' | 'MERCH' }) => {
    try {
      await editProduct(productId, productData);
    } catch (error) {
      // Handle error silently
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
      const results = await importProducts(selectedFile);
      setImportResults(results);
      if (results.errors.length === 0) {
        setIsImportModalOpen(false);
        setSelectedFile(null);
        mutate(); // Refresh products list
      }
    } catch (error) {
      // Handle error silently
    }
  };

  const toggleDropdown = (productId: string, event: React.MouseEvent) => {
    if (openDropdown === productId) {
      setOpenDropdown(null);
      setProductToDelete(null);
    } else {
      const rect = event.currentTarget.getBoundingClientRect();
      setDropdownPosition({
        x: rect.right - 192, // 192px is the width of the dropdown (w-48)
        y: rect.bottom + 8
      });
      setOpenDropdown(productId);
      const product = products.find((p: Product) => p.id === productId);
      setProductToDelete(product || null);
    }
  };

  const columns = [
    { key: 'brand', label: 'Brand' },
    { key: 'name', label: 'Name' },
    { key: 'color', label: 'Color' },
    { key: 'sku', label: 'SKU' },
    { key: 'itemType', label: 'Type' },
  ];

  if (isLoading) {
    return (
      <ProtectedRoute>
        <Layout>
          <PageLoader />
        </Layout>
      </ProtectedRoute>
    );
  }

  if (isError) {
    return (
      <ProtectedRoute>
        <Layout>
          <div className="flex items-center justify-center h-64">
            <div className="text-center space-y-4">
              <div className="text-6xl">⚠️</div>
              <div className="text-lg text-red-600">Error loading products</div>
              <p className="text-muted-foreground">Please try refreshing the page</p>
            </div>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <Layout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              {showArchived ? 'Archived Products' : 'Products'}
            </h1>
            <p className="text-muted-foreground mt-2">
              {showArchived ? 'View and restore archived products' : 'Manage your product catalog'}
            </p>
          </div>
          <div className="flex space-x-2">
            <button 
              onClick={() => setShowArchived(!showArchived)}
              className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 transition-colors"
            >
              {showArchived ? 'View Active' : 'View Archived'}
            </button>
            {!showArchived && (
              <>
                <Button onClick={() => setIsModalOpen(true)}>
                  <span className="mr-2">+</span>
                  Add Product
                </Button>
                <Button onClick={() => setIsImportModalOpen(true)}>
                  <span className="mr-2">📁</span>
                  Import Products
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Search and Filters */}
        <Card>
          <div className="p-6">
            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder={`Search ${showArchived ? 'archived ' : ''}products by name, brand, or SKU...`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <select className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent">
                <option value="">All Brands</option>
                <option value="Jordan">Jordan</option>
                <option value="Nike">Nike</option>
                <option value="adidas">adidas</option>
                <option value="New Balance">New Balance</option>
                <option value="Converse">Converse</option>
                <option value="Vans">Vans</option>
                <option value="Puma">Puma</option>
                <option value="Reebok">Reebok</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Products Table */}
        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">
                {showArchived ? 'Archived Products' : 'Products'} ({filteredProducts.length})
              </h3>
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <span>Showing {filteredProducts.length} of {products.length} products</span>
              </div>
            </div>

            <div className="overflow-x-auto relative">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    {columns.map((column) => (
                      <th
                        key={column.key}
                        className="text-left py-3 px-4 font-medium text-foreground"
                      >
                        {column.label}
                      </th>
                    ))}
                    <th className="text-right py-3 px-4 font-medium text-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((product: Product) => (
                    <tr key={product.id} className="border-b border-muted hover:bg-accent">
                      <td className="py-3 px-4">
                        <span className="font-medium text-foreground">{product.brand}</span>
                      </td>
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium text-foreground">{product.name}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-muted-foreground">{product.color}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-muted-foreground font-mono">{product.sku}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          product.itemType === 'SHOE' ? 'bg-blue-100 text-blue-800' :
                          product.itemType === 'APPAREL' ? 'bg-green-100 text-green-800' :
                          'bg-purple-100 text-purple-800'
                        }`}>
                          {product.itemType}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="relative">
                          <button
                            onClick={(e) => toggleDropdown(product.id, e)}
                            className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors"
                            disabled={isDeleting || isRestoring}
                          >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredProducts.length === 0 && (
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  {showArchived ? 'No archived products found' : 'No products found'}
                </p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Add Product Modal */}
      <AddProductModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleAddProduct}
        isLoading={isAdding}
      />

      {/* Edit Product Modal */}
      <EditProductModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setProductToEdit(null);
        }}
        onSubmit={handleEditSubmit}
        isLoading={isEditing}
        product={productToEdit}
      />
      
      {/* Delete Prompt Modal */}
      <PromptModal
        show={showPrompt}
        title={deleteType === 'archive' ? 'Archive Product' : 'Delete Product Permanently'}
        onClose={() => { setShowPrompt(false); setProductToDelete(null); }}
      >
        <div className="space-y-4">
          <p>
            {deleteType === 'archive' 
              ? `Are you sure you want to archive "${productToDelete?.name}"? This will hide it from the main view but preserve all data.`
              : `Are you sure you want to permanently delete "${productToDelete?.name}"? This action cannot be undone and will remove all related transactions and inventory items.`
            }
          </p>
          <div className="flex justify-end space-x-3">
            <button
              className="px-4 py-2 rounded bg-gray-200 text-gray-800 hover:bg-gray-300"
              onClick={() => { setShowPrompt(false); setProductToDelete(null); }}
              disabled={isDeleting}
            >
              Cancel
            </button>
            <button
              className={`px-4 py-2 rounded ${
                deleteType === 'archive' 
                  ? 'bg-orange-500 text-white hover:bg-orange-600' 
                  : 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
              }`}
              onClick={handleDeleteProduct}
              disabled={isDeleting}
            >
              {isDeleting ? 'Processing...' : (deleteType === 'archive' ? 'Archive' : 'Delete Permanently')}
            </button>
          </div>
        </div>
      </PromptModal>

      {/* Force Delete Prompt Modal */}
      <PromptModal
        show={showForcePrompt}
        title="Force Delete Everything"
        onClose={() => { setShowForcePrompt(false); setProductToDelete(null); }}
      >
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-red-600 text-lg">⚠️</span>
              <span className="font-semibold text-red-800">Dangerous Operation</span>
            </div>
            <p className="text-red-700 text-sm">
              This will permanently delete <strong>"{productToDelete?.name}"</strong> and <strong>ALL related data</strong> including:
            </p>
            <ul className="text-red-700 text-sm mt-2 ml-4 list-disc">
              <li>All stock transactions</li>
              <li>All inventory items</li>
              <li>All historical data</li>
              <li>All audit trails</li>
            </ul>
            <p className="text-red-700 text-sm mt-2 font-semibold">
              This action cannot be undone!
            </p>
          </div>
          <div className="flex justify-end space-x-3">
            <button
              className="px-4 py-2 rounded bg-gray-200 text-gray-800 hover:bg-gray-300"
              onClick={() => { setShowForcePrompt(false); setProductToDelete(null); }}
              disabled={isDeleting}
            >
              Cancel
            </button>
            <button
              className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700"
              onClick={handleDeleteProduct}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting Everything...' : 'Yes, Delete Everything'}
            </button>
          </div>
        </div>
      </PromptModal>

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
              {showArchived ? (
                // Archived product actions
                <button
                  onClick={() => handleRestoreProduct(productToDelete!.id)}
                  className="w-full text-left px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 flex items-center gap-2"
                  disabled={isRestoring}
                >
                  <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Restore
                </button>
                             ) : (
                 // Active product actions
                 <>
                   <button
                     onClick={() => handleEditProduct(productToDelete!)}
                     className="w-full text-left px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 flex items-center gap-2"
                     disabled={isEditing}
                   >
                     <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                     </svg>
                     Edit
                   </button>
                   <button
                     onClick={() => handleDeletePrompt(productToDelete!, 'archive')}
                     className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                     disabled={isDeleting}
                   >
                     <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-14 0h14" />
                     </svg>
                     Archive
                   </button>
                   <button
                     onClick={() => handleDeletePrompt(productToDelete!, 'hard')}
                     className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                     disabled={isDeleting}
                   >
                     <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                     </svg>
                     Delete
                   </button>
                   <button
                     onClick={() => handleDeletePrompt(productToDelete!, 'force')}
                     className="w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-red-50 flex items-center gap-2"
                     disabled={isDeleting}
                   >
                     <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                     </svg>
                     Force Delete
                   </button>
                 </>
               )}
            </div>
          </div>
        </>
      )}

      {isImportModalOpen && (
        <Modal open={isImportModalOpen} onClose={() => setIsImportModalOpen(false)}>
          <div className="space-y-4">
            <h2 className="text-xl font-bold mb-2">Import Products from CSV</h2>
            <p className="text-muted-foreground text-sm mb-2">
              Upload a CSV file with product and inventory details. You can download a template below.
            </p>
            <a
              href="/import-products-template.csv"
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
                  <li>Products created: {importResults.productsCreated}</li>
                  <li>Products updated: {importResults.productsUpdated}</li>
                  <li>Inventory items created: {importResults.inventoryItemsCreated}</li>
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
      </Layout>
    </ProtectedRoute>
  );
} 
