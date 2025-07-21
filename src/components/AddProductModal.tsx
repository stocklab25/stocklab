'use client';

import { useState, useEffect } from 'react';
import Modal from './Modal';
import Button from './Button';
import Input from './Input';
import useCheckSku from '@/hooks/useCheckSku';

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (product: { brand: string; name: string; sku?: string; itemType: 'SHOE' | 'APPAREL' | 'ACCESSORIES' }) => void;
  isLoading?: boolean;
}

function generateSkuPattern() {
  // 2 random uppercase letters + 4 random digits
  const letters = Array.from({ length: 2 }, () => String.fromCharCode(65 + Math.floor(Math.random() * 26))).join('');
  const digits = Math.floor(1000 + Math.random() * 9000).toString();
  return `${letters}${digits}`;
}

interface ProductItem {
  id: string;
  brand: string;
  name: string;
  sku?: string;
  itemType: 'SHOE' | 'APPAREL' | 'ACCESSORIES';
}

export default function AddProductModal({ isOpen, onClose, onSubmit, isLoading = false }: AddProductModalProps) {
  const [formData, setFormData] = useState({
    brand: '',
    name: '',
    sku: '',
    itemType: 'SHOE' as 'SHOE' | 'APPAREL' | 'ACCESSORIES',
  });
  const [autoSku, setAutoSku] = useState(true);
  const [skuError, setSkuError] = useState('');
  const { checkSkuExists, isChecking } = useCheckSku();
  const [generatedSku, setGeneratedSku] = useState('');
  const [productList, setProductList] = useState<ProductItem[]>([]);
  const [isSubmittingAll, setIsSubmittingAll] = useState(false);

  // Generate a unique SKU only when modal opens or when toggling autoSku ON
  useEffect(() => {
    const generateUniqueSku = async () => {
      let sku = '';
      let exists = true;
      let attempts = 0;
      while (exists && attempts < 10) {
        sku = generateSkuPattern();
        exists = await checkSkuExists(sku);
        attempts++;
      }
      setGeneratedSku(sku);
      setSkuError(exists ? 'Could not generate a unique SKU, try again.' : '');
    };
    if (isOpen && autoSku) {
      generateUniqueSku();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // When toggling autoSku ON, generate a new SKU
  useEffect(() => {
    if (autoSku && isOpen) {
      setFormData((prev) => ({ ...prev, sku: '' })); // clear manual SKU
      const generateUniqueSku = async () => {
        let sku = '';
        let exists = true;
        let attempts = 0;
        while (exists && attempts < 10) {
          sku = generateSkuPattern();
          exists = await checkSkuExists(sku);
          attempts++;
        }
        setGeneratedSku(sku);
        setSkuError(exists ? 'Could not generate a unique SKU, try again.' : '');
      };
      generateUniqueSku();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSku]);

  const currentSku = autoSku ? generatedSku : formData.sku;

  // Only check SKU uniqueness for manual input, and only on change
  const handleManualSkuChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData({ ...formData, sku: value });
    setSkuError('');
    if (value && value.length >= 3) {
      const exists = await checkSkuExists(value);
      if (exists) {
        setSkuError('This SKU already exists. Please choose a different one.');
      }
    }
  };

  const handleAddToList = async (e: React.FormEvent) => {
    e.preventDefault();
    // Final validation before adding to list
    if (currentSku) {
      const exists = await checkSkuExists(currentSku);
      if (exists) {
        setSkuError('This SKU already exists. Please choose a different one.');
        return;
      }
    }

    const newProduct: ProductItem = {
      id: Date.now().toString(),
      brand: formData.brand,
      name: formData.name,
      sku: currentSku,
      itemType: formData.itemType,
    };

    setProductList([...productList, newProduct]);
    
    // Reset form for next product
    setFormData({ brand: '', name: '', sku: '', itemType: 'SHOE' as 'SHOE' | 'APPAREL' | 'ACCESSORIES' });
    setAutoSku(true);
    setSkuError('');
    setGeneratedSku('');
    
    // Generate new SKU for next product
    if (autoSku) {
      const generateUniqueSku = async () => {
        let sku = '';
        let exists = true;
        let attempts = 0;
        while (exists && attempts < 10) {
          sku = generateSkuPattern();
          exists = await checkSkuExists(sku);
          attempts++;
        }
        setGeneratedSku(sku);
      };
      generateUniqueSku();
    }
  };

  const handleRemoveFromList = (id: string) => {
    setProductList(productList.filter(product => product.id !== id));
  };

  const handleSubmitAll = async () => {
    if (productList.length === 0) return;
    
    setIsSubmittingAll(true);
    try {
      for (const product of productList) {
        await onSubmit(product);
      }
      handleClose();
    } catch (error) {
      // Handle error silently
    } finally {
      setIsSubmittingAll(false);
    }
  };

  const handleClose = () => {
    setFormData({ brand: '', name: '', sku: '', itemType: 'SHOE' as 'SHOE' | 'APPAREL' | 'ACCESSORIES' });
    setAutoSku(true);
    setSkuError('');
    setGeneratedSku('');
    setProductList([]);
    setIsSubmittingAll(false);
    onClose();
  };

  const handleRegenerateSku = async () => {
    if (autoSku) {
      let sku = '';
      let exists = true;
      let attempts = 0;
      while (exists && attempts < 10) {
        sku = generateSkuPattern();
        exists = await checkSkuExists(sku);
        attempts++;
      }
      setGeneratedSku(sku);
      setSkuError(exists ? 'Could not generate a unique SKU, try again.' : '');
    }
  };

  return (
    <Modal open={isOpen} onClose={handleClose} width="5xl">
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">Add New Product</h2>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> A StockLab SKU (SL001, SL002, etc.) will be automatically generated for this product.
          </p>
        </div>
        
        {productList.length > 0 ? (
          <div className="space-y-6">
            {/* Add Product Form */}
            <div className="space-y-4">
              <h4 className="text-lg font-medium text-foreground">Add Product</h4>
              <form onSubmit={handleAddToList} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="brand" className="block text-sm font-medium text-foreground mb-1">
                      Brand *
                    </label>
                    <Input
                      id="brand"
                      type="text"
                      value={formData.brand}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, brand: e.target.value })}
                      placeholder="e.g., Nike, Jordan, adidas"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-foreground mb-1">
                      Product Name *
                    </label>
                    <Input
                      id="name"
                      type="text"
                      value={formData.name}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Air Jordan 1 Retro High OG"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="itemType" className="block text-sm font-medium text-foreground mb-1">
                      Item Type *
                    </label>
                    <select
                      id="itemType"
                      value={formData.itemType}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, itemType: e.target.value as 'SHOE' | 'APPAREL' | 'ACCESSORIES' })}
                      className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      required
                    >
                      <option value="SHOE">Shoe</option>
                      <option value="APPAREL">Apparel</option>
                      <option value="ACCESSORIES">Accessories</option>
                    </select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={autoSku}
                          onChange={() => setAutoSku((v) => !v)}
                          className="accent-primary"
                        />
                        Auto-generate SKU
                      </label>
                      {autoSku && (
                        <button
                          type="button"
                          onClick={handleRegenerateSku}
                          className="text-sm text-primary hover:underline"
                          disabled={isChecking}
                        >
                          Regenerate
                        </button>
                      )}
                    </div>
                    <Input
                      id="sku"
                      type="text"
                      value={currentSku}
                      onChange={autoSku ? undefined : handleManualSkuChange}
                      placeholder="e.g., AB1234"
                      disabled={autoSku}
                      required={!autoSku}
                      error={skuError}
                    />
                    {isChecking && (
                      <p className="text-xs text-muted-foreground mt-1">Checking SKU availability...</p>
                    )}
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button type="submit" loading={isLoading} disabled={!!skuError}>
                    {isLoading ? 'Adding...' : 'Add to List'}
                  </Button>
                </div>
              </form>
            </div>

            {/* Product List */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-foreground">Products in List ({productList.length})</h3>
              <div className="overflow-x-auto max-h-64 border border-gray-200 rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Brand
                      </th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Product Name
                      </th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        SKU
                      </th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {productList.map((product) => (
                      <tr key={product.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{product.brand}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{product.name}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 font-mono">{product.sku}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{product.itemType}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                          <button
                            type="button"
                            onClick={() => handleRemoveFromList(product.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end space-x-3">
                <Button type="button" variant="outline" onClick={handleClose} disabled={isLoading || isSubmittingAll}>
                  Cancel
                </Button>
                <Button type="button" onClick={handleSubmitAll} loading={isSubmittingAll} disabled={isSubmittingAll || isLoading}>
                  {isSubmittingAll ? 'Submitting...' : `Submit All (${productList.length})`}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleAddToList} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="brand" className="block text-sm font-medium text-foreground mb-1">
                  Brand *
                </label>
                <Input
                  id="brand"
                  type="text"
                  value={formData.brand}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, brand: e.target.value })}
                  placeholder="e.g., Nike, Jordan, adidas"
                  required
                />
              </div>

              <div>
                <label htmlFor="name" className="block text-sm font-medium text-foreground mb-1">
                  Product Name *
                </label>
                <Input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Air Jordan 1 Retro High OG"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="itemType" className="block text-sm font-medium text-foreground mb-1">
                  Item Type *
                </label>
                <select
                  id="itemType"
                  value={formData.itemType}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, itemType: e.target.value as 'SHOE' | 'APPAREL' | 'ACCESSORIES' })}
                  className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  required
                >
                  <option value="SHOE">Shoe</option>
                  <option value="APPAREL">Apparel</option>
                  <option value="ACCESSORIES">Accessories</option>
                </select>
                <p className="text-xs text-muted-foreground mt-1">
                  Shoe & Apparel items typically have sizes. Accessories items (caps, bags, accessories) usually don't have sizes.
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={autoSku}
                      onChange={() => setAutoSku((v) => !v)}
                      className="accent-primary"
                    />
                    Auto-generate SKU
                  </label>
                  {autoSku && (
                    <button
                      type="button"
                      onClick={handleRegenerateSku}
                      className="text-sm text-primary hover:underline"
                      disabled={isChecking}
                    >
                      Regenerate
                    </button>
                  )}
                </div>
                <Input
                  id="sku"
                  type="text"
                  value={currentSku}
                  onChange={autoSku ? undefined : handleManualSkuChange}
                  placeholder="e.g., AB1234"
                  disabled={autoSku}
                  required={!autoSku}
                  error={skuError}
                />
                {isChecking && (
                  <p className="text-xs text-muted-foreground mt-1">Checking SKU availability...</p>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button type="button" variant="outline" onClick={handleClose} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" loading={isLoading} disabled={!!skuError}>
                {isLoading ? 'Adding...' : 'Add to List'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
} 
