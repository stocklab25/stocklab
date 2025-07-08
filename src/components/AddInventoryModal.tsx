'use client';

import { useState, useEffect } from 'react';
import { useAddInventory } from '@/hooks/useAddInventory';
import useProducts from '@/hooks/useProducts';
import useInventory from '@/hooks/useInventory';

interface AddInventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface Product {
  id: string;
  brand: string;
  name: string;
  color: string;
  sku: string;
  itemType: 'SHOE' | 'APPAREL';
}

export default function AddInventoryModal({ isOpen, onClose, onSuccess }: AddInventoryModalProps) {
  const { addInventory, loading, error } = useAddInventory();
  const { data: products } = useProducts();
  const { data: inventoryItems } = useInventory();
  
  const [formData, setFormData] = useState({
    productId: '',
    sku: '',
    size: '',
    condition: 'NEW',
    cost: '',
    payout: '',
    consigner: '',
    consignDate: new Date().toISOString().split('T')[0],
    status: 'InStock',
    quantity: '1'
  });

  const [selectedProductType, setSelectedProductType] = useState<'SHOE' | 'APPAREL'>('SHOE');
  const [validationError, setValidationError] = useState<string>('');

  // Check for duplicate size when product or size changes
  useEffect(() => {
    console.log('🔍 Validation check triggered:', {
      productId: formData.productId,
      size: formData.size,
      inventoryItemsCount: inventoryItems?.length || 0
    });
    
    if (formData.sku && formData.size) {
      console.log('🔍 Checking for duplicates...');
      console.log('🔍 Current inventory items:', inventoryItems);
      console.log('🔍 First inventory item structure:', inventoryItems?.[0]);
      
      const existingItem = inventoryItems?.find((item: any) => {
        const matches = item.sku === formData.sku && 
                       item.size === formData.size; // Remove deletedAt check since it's not in the data
        
        console.log('🔍 Checking item:', {
          itemId: item.id,
          itemSku: item.sku,
          itemSize: item.size,
          formSku: formData.sku,
          formSize: formData.size,
          skuMatch: item.sku === formData.sku,
          sizeMatch: item.size === formData.size,
          matches
        });
        
        return matches;
      });
      
      console.log('🔍 Found existing item:', existingItem);
      
      if (existingItem) {
        const errorMsg = `An inventory item with size ${formData.size} already exists for this product.`;
        console.log('🔍 Setting validation error:', errorMsg);
        setValidationError(errorMsg);
      } else {
        console.log('🔍 No duplicate found, clearing validation error');
        setValidationError('');
      }
    } else {
      console.log('🔍 Missing productId or size, clearing validation error');
      setValidationError('');
    }
  }, [formData.sku, formData.size, inventoryItems]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check for duplicate before submitting
    if (validationError) {
      return;
    }
    
    const result = await addInventory({
      ...formData,
      condition: formData.condition as 'NEW' | 'PRE_OWNED',
      cost: parseFloat(formData.cost),
      payout: parseFloat(formData.payout),
      quantity: parseInt(formData.quantity)
    });

    if (result?.success) {
      onSuccess();
      onClose();
      // Reset form
      setFormData({
        productId: '',
        sku: '',
        size: '',
        condition: 'NEW',
        cost: '',
        payout: '',
        consigner: '',
        consignDate: new Date().toISOString().split('T')[0],
        status: 'InStock',
        quantity: '1'
      });
      setSelectedProductType('SHOE');
      setValidationError('');
    }
  };

  const handleProductChange = (productId: string) => {
    console.log('🔍 Product changed to:', productId);
    const selectedProduct = products?.find((product: Product) => product.id === productId);
    if (selectedProduct) {
      console.log('🔍 Selected product:', selectedProduct);
      // Use the product's SKU and itemType
      setFormData({ ...formData, productId, sku: selectedProduct.sku || '' });
      setSelectedProductType(selectedProduct.itemType);
    } else {
      setFormData({ ...formData, productId });
      setSelectedProductType('SHOE');
    }
  };

  const handleSizeChange = (size: string) => {
    console.log('🔍 Size changed to:', size);
    setFormData({ ...formData, size });
  };

  const handleClose = () => {
    onClose();
    // Reset form
    setFormData({
      productId: '',
      sku: '',
      size: '',
      condition: 'NEW',
      cost: '',
      payout: '',
      consigner: '',
      consignDate: new Date().toISOString().split('T')[0],
      status: 'InStock',
      quantity: '1'
    });
    setSelectedProductType('SHOE');
    setValidationError('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-background rounded-lg p-6 w-1/2 mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-foreground">Add Inventory Item</h2>
          <button
            onClick={handleClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Product Selection */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Product *
            </label>
            <select
              value={formData.productId}
              onChange={(e) => handleProductChange(e.target.value)}
              required
              className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="">Select a product</option>
              {products?.map((product: Product) => (
                <option key={product.id} value={product.id}>
                  {product.brand} - {product.name} ({product.color})
                </option>
              ))}
            </select>
          </div>

          {/* SKU */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              SKU * (Auto-filled from product)
            </label>
            <input
              type="text"
              value={formData.sku}
              readOnly
              className="w-full px-3 py-2 border border-input rounded-lg bg-muted text-muted-foreground cursor-not-allowed"
              placeholder="Select a product to auto-fill SKU"
            />
          </div>

          {/* Size */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Size * ({selectedProductType === 'SHOE' ? 'Shoe' : 'Apparel'})
            </label>
            {selectedProductType === 'SHOE' ? (
              <select
                value={formData.size}
                onChange={(e) => handleSizeChange(e.target.value)}
                required
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ${
                  validationError ? 'border-red-500' : 'border-input'
                }`}
              >
                <option value="">Select shoe size</option>
                {Array.from({ length: 14 }, (_, i) => i + 1).map(size => (
                  <option key={size} value={size.toString()}>{size}</option>
                ))}
                {Array.from({ length: 13 }, (_, i) => i + 1.5).map(size => (
                  <option key={size} value={size.toString()}>{size}</option>
                ))}
              </select>
            ) : (
              <select
                value={formData.size}
                onChange={(e) => handleSizeChange(e.target.value)}
                required
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ${
                  validationError ? 'border-red-500' : 'border-input'
                }`}
              >
                <option value="">Select apparel size</option>
                <option value="XS">XS</option>
                <option value="S">S</option>
                <option value="M">M</option>
                <option value="L">L</option>
                <option value="XL">XL</option>
                <option value="XXL">XXL</option>
              </select>
            )}
            {validationError && (
              <p className="text-red-500 text-sm mt-1">{validationError}</p>
            )}
          </div>

          {/* Condition */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Condition *
            </label>
            <select
              value={formData.condition}
              onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
              required
              className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="NEW">NEW</option>
              <option value="PRE_OWNED">PRE-OWNED</option>
            </select>
          </div>

          {/* Cost and Payout */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Cost ($) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.cost}
                onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                required
                className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Payout ($) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.payout}
                onChange={(e) => setFormData({ ...formData, payout: e.target.value })}
                required
                className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Consigner */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Consigner *
            </label>
            <input
              type="text"
              value={formData.consigner}
              onChange={(e) => setFormData({ ...formData, consigner: e.target.value })}
              required
              className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="Consigner name"
            />
          </div>

          {/* Consign Date */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Consign Date *
            </label>
            <input
              type="date"
              value={formData.consignDate}
              onChange={(e) => setFormData({ ...formData, consignDate: e.target.value })}
              required
              className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Status *
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              required
              className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="InStock">In Stock</option>
              <option value="Sold">Sold</option>
              <option value="Returned">Returned</option>
              <option value="OutOfStock">Out of Stock</option>
            </select>
          </div>

          {/* Quantity */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Quantity
              </label>
              <input
                type="number"
                min="1"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="1"
              />
          </div>

          {error && (
            <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2 border border-input rounded-lg text-foreground hover:bg-accent transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !!validationError}
              className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Adding...' : 'Add Inventory Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 