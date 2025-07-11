'use client';

import { useState, useEffect } from 'react';
import useProducts from '@/hooks/useProducts';
import useInventory from '@/hooks/useInventory';

interface EditInventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  inventoryItem: any;
}

interface Product {
  id: string;
  brand: string;
  name: string;
  color: string;
  sku: string;
  itemType: 'SHOE' | 'APPAREL' | 'MERCH';
}

export default function EditInventoryModal({ isOpen, onClose, onSuccess, inventoryItem }: EditInventoryModalProps) {
  const { data: products } = useProducts();
  const { data: inventoryItems, mutate } = useInventory();
  
  const [formData, setFormData] = useState({
    productId: '',
    sku: '',
    size: '',
    condition: 'NEW',
    cost: '',
    status: 'InStock',
    quantity: '1',
    vendor: '',
    paymentMethod: ''
  });

  const [selectedProductType, setSelectedProductType] = useState<'SHOE' | 'APPAREL' | 'MERCH'>('SHOE');
  const [validationError, setValidationError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  // Initialize form data when modal opens with inventory item data
  useEffect(() => {
    if (isOpen && inventoryItem) {
      const selectedProduct = products?.find((product: Product) => product.id === inventoryItem.productId);
      setFormData({
        productId: inventoryItem.productId || '',
        sku: inventoryItem.sku || '',
        size: inventoryItem.size || '',
        condition: inventoryItem.condition || 'NEW',
        cost: inventoryItem.cost?.toString() || '',
        status: inventoryItem.status || 'InStock',
        quantity: inventoryItem.quantity?.toString() || '1',
        vendor: inventoryItem.vendor || '',
        paymentMethod: inventoryItem.paymentMethod || ''
      });
      setSelectedProductType(selectedProduct?.itemType || 'SHOE');
      setValidationError('');
    }
  }, [isOpen, inventoryItem, products]);

  // Check for duplicate size when product or size changes (excluding current item)
  useEffect(() => {
    if (selectedProductType === 'MERCH') {
      setValidationError('');
      return;
    }
    
    if (formData.sku && formData.size) {
      const existingItem = inventoryItems?.find((item: any) => {
        return item.sku === formData.sku && 
               item.size === formData.size && 
               item.id !== inventoryItem?.id; // Exclude current item
      });
      
      if (existingItem) {
        setValidationError(`An inventory item with size ${formData.size} already exists for this product.`);
      } else {
        setValidationError('');
      }
    } else {
      setValidationError('');
    }
  }, [formData.sku, formData.size, selectedProductType, inventoryItems, inventoryItem?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validationError && selectedProductType !== 'MERCH') {
      return;
    }
    
    if (!formData.vendor || !formData.paymentMethod) {
      setValidationError('Vendor and Payment Method are required.');
      return;
    }

    setIsLoading(true);
    try {
      const sizeValue = selectedProductType === 'MERCH' ? 'N/A' : formData.size;
      
      const response = await fetch(`/api/inventory/${inventoryItem.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId: formData.productId,
          sku: formData.sku,
          size: sizeValue,
          condition: formData.condition,
          cost: parseFloat(formData.cost),
          quantity: parseInt(formData.quantity),
          status: formData.status,
          vendor: formData.vendor,
          paymentMethod: formData.paymentMethod
        }),
      });

      if (response.ok) {
        await mutate(); // Refresh inventory data
        onSuccess();
        onClose();
      } else {
        const errorData = await response.json();
        setValidationError(errorData.error || 'Failed to update inventory item');
      }
    } catch (error) {
      
      setValidationError('Failed to update inventory item');
    } finally {
      setIsLoading(false);
    }
  };

  const handleProductChange = (productId: string) => {
    const selectedProduct = products?.find((product: Product) => product.id === productId);
    if (selectedProduct) {
      setFormData({ ...formData, productId, sku: selectedProduct.sku || '' });
      setSelectedProductType(selectedProduct.itemType);
    } else {
      setFormData({ ...formData, productId });
      setSelectedProductType('SHOE');
    }
  };

  const handleClose = () => {
    onClose();
    setValidationError('');
    setIsLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-background rounded-lg p-6 w-1/2 mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-foreground">Edit Inventory Item</h2>
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
              className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              required
            >
              <option value="">Select a product</option>
              {products?.map((product: Product) => (
                <option key={product.id} value={product.id}>
                  {product.brand} - {product.name} ({product.sku})
                </option>
              ))}
            </select>
          </div>

          {/* SKU */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              SKU *
            </label>
            <input
              type="text"
              value={formData.sku}
              onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
              className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="Enter SKU"
              required
            />
          </div>

          {/* Size (only for SHOES and APPAREL) */}
          {selectedProductType !== 'MERCH' && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Size *
              </label>
              <input
                type="text"
                value={formData.size}
                onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Enter size"
                required
              />
            </div>
          )}

          {/* Condition */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Condition *
            </label>
            <select
              value={formData.condition}
              onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
              className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              required
            >
              <option value="NEW">New</option>
              <option value="PRE_OWNED">Pre-owned</option>
            </select>
          </div>

          {/* Cost */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Cost *
            </label>
            <input
              type="number"
              value={formData.cost}
              onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
              className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="Enter cost"
              step="0.01"
              min="0"
              required
            />
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Quantity *
            </label>
            <input
              type="number"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="Enter quantity"
              min="0"
              required
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
              className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              required
            >
              <option value="InStock">In Stock</option>
              <option value="OutOfStock">Out of Stock</option>
              <option value="Reserved">Reserved</option>
            </select>
          </div>

          {/* Vendor */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Vendor *
            </label>
            <input
              type="text"
              value={formData.vendor}
              onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
              className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="Enter vendor"
              required
            />
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Payment Method *
            </label>
            <select
              value={formData.paymentMethod}
              onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
              className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              required
            >
              <option value="">Select payment method</option>
              <option value="CASH">Cash</option>
              <option value="CARD">Card</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
              <option value="DIGITAL_WALLET">Digital Wallet</option>
              <option value="CREDIT">Credit</option>
            </select>
          </div>

          {/* Validation Error */}
          {validationError && (
            <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">
              {validationError}
            </div>
          )}

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-foreground border border-input rounded-lg hover:bg-accent transition-colors"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
              disabled={isLoading}
            >
              {isLoading ? 'Updating...' : 'Update Inventory Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 
