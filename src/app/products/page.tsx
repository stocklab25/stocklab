'use client';

import { useState } from 'react';
import Layout from '@/components/Layout';
import { Card } from '@/components/Card';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useProducts, useAddProduct } from '@/hooks';
import { useDeleteProduct } from '@/hooks/useDeleteProduct';
import { useRestoreProduct } from '@/hooks/useRestoreProduct';
import { useEditProduct } from '@/hooks/useEditProduct';
import AddProductModal from '@/components/AddProductModal';
import PromptModal from '@/components/PromptModal';
import { PageLoader } from '@/components/Loader';
import Button from '@/components/Button';
import Input from '@/components/Input';
import useCheckSku from '@/hooks/useCheckSku';

interface Product {
  id: string;
  brand: string;
  name: string;
  sku?: string;
  itemType: string;
  deletedAt?: string;
}

interface EditingProduct {
  id: string;
  brand: string;
  name: string;
  sku: string;
  itemType: string;
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
  const { editProduct, loading: isSaving } = useEditProduct({
    onSuccess: () => {
      mutate();
      setEditingProduct(null);
    },
    onError: (error) => {
      // Handle error silently
    }
  });
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [deleteType, setDeleteType] = useState<'archive' | 'hard' | 'force'>('archive');
  const [showForcePrompt, setShowForcePrompt] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ x: 0, y: 0 });
  
  // Inline editing state
  const [editingProduct, setEditingProduct] = useState<EditingProduct | null>(null);
  const [skuError, setSkuError] = useState('');
  const { checkSkuExists, isChecking } = useCheckSku();

  // Filter products based on archived status
  const filteredProducts = products.filter((product: Product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.sku && product.sku.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const isArchived = !!product.deletedAt;
    return matchesSearch && (showArchived ? isArchived : !isArchived);
  });

  const handleAddProduct = async (productData: { brand: string; name: string; sku?: string; itemType: string }) => {
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

  const handleStartEdit = (product: Product) => {
    setEditingProduct({
      id: product.id,
      brand: product.brand,
      name: product.name,
      sku: product.sku || '',
      itemType: product.itemType,
    });
    setSkuError('');
    setOpenDropdown(null);
  };

  const handleCancelEdit = () => {
    setEditingProduct(null);
    setSkuError('');
  };

  const handleEditChange = (field: keyof EditingProduct, value: string) => {
    if (!editingProduct) return;
    
    setEditingProduct({ ...editingProduct, [field]: value });
    
    // Check SKU uniqueness for manual input
    if (field === 'sku') {
      setSkuError('');
      if (value && value.length >= 3) {
        const originalProduct = products.find((p: Product) => p.id === editingProduct.id);
        if (value !== originalProduct?.sku) {
          checkSkuExists(value).then(exists => {
            if (exists) {
              setSkuError('This SKU already exists. Please choose a different one.');
            }
          });
        }
      }
    }
  };

  const handleSaveEdit = async () => {
    if (!editingProduct) return;

    // Final validation before submit
    if (editingProduct.sku) {
      const originalProduct = products.find((p: Product) => p.id === editingProduct.id);
      if (editingProduct.sku !== originalProduct?.sku) {
        const exists = await checkSkuExists(editingProduct.sku);
        if (exists) {
          setSkuError('This SKU already exists. Please choose a different one.');
          return;
        }
      }
    }

    try {
      await editProduct(editingProduct.id, {
        id: editingProduct.id,
        brand: editingProduct.brand,
        name: editingProduct.name,
        sku: editingProduct.sku || undefined,
        itemType: editingProduct.itemType,
      } as Product);
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
              <div className="text-6xl">!</div>
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
              <Button onClick={() => setIsModalOpen(true)}>
                <span className="mr-2">+</span>
                Add Product
              </Button>
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
                  className="w-full px-4 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <select className="px-4 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent">
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
                  {filteredProducts.map((product: Product) => {
                    const isEditing = editingProduct?.id === product.id;
                    
                    return (
                      <tr key={product.id} className="border-b border-muted hover:bg-accent">
                        <td className="py-3 px-4">
                          {isEditing ? (
                            <Input
                              type="text"
                              value={editingProduct.brand}
                              onChange={(e) => handleEditChange('brand', e.target.value)}
                              className="w-full"
                              placeholder="Brand"
                            />
                          ) : (
                            <span className="font-medium text-foreground">{product.brand}</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {isEditing ? (
                            <Input
                              type="text"
                              value={editingProduct.name}
                              onChange={(e) => handleEditChange('name', e.target.value)}
                              className="w-full"
                              placeholder="Product name"
                            />
                          ) : (
                            <div>
                              <p className="font-medium text-foreground">{product.name}</p>
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {isEditing ? (
                            <div>
                              <Input
                                type="text"
                                value={editingProduct.sku}
                                onChange={(e) => handleEditChange('sku', e.target.value)}
                                className="w-full font-mono"
                                placeholder="SKU"
                              />
                              {skuError && (
                                <p className="text-xs text-red-600 mt-1">{skuError}</p>
                              )}
                              {isChecking && (
                                <p className="text-xs text-blue-600 mt-1">Checking...</p>
                              )}
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground font-mono">{product.sku}</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {isEditing ? (
                            <Input
                              type="text"
                              value={editingProduct.itemType}
                              onChange={(e) => handleEditChange('itemType', e.target.value)}
                              className="w-full"
                              placeholder="Item type"
                            />
                          ) : (
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              product.itemType === 'SHOE' ? 'bg-blue-100 text-blue-800' :
                              product.itemType === 'APPAREL' ? 'bg-green-100 text-green-800' :
                              'bg-purple-100 text-purple-800'
                            }`}>
                              {product.itemType}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {isEditing ? (
                            <div className="flex items-center justify-end space-x-2">
                              <button
                                onClick={handleSaveEdit}
                                disabled={isSaving || !!skuError}
                                className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                              >
                                {isSaving ? 'Saving...' : 'Save'}
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                disabled={isEditing}
                                className="px-3 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
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
                          )}
                        </td>
                      </tr>
                    );
                  })}
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
              <span className="text-red-600 text-lg">!</span>
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
                     onClick={() => handleStartEdit(productToDelete!)}
                     className="w-full text-left px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 flex items-center gap-2"
                     disabled={isSaving}
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
      </Layout>
    </ProtectedRoute>
  );
} 
