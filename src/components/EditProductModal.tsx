'use client';

import { useState, useEffect } from 'react';
import Modal from './Modal';
import Button from './Button';
import Input from './Input';
import useCheckSku from '@/hooks/useCheckSku';

interface Product {
  id: string;
  brand: string;
  name: string;
  sku?: string;
  itemType: string;
}

interface EditProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (productId: string, product: { brand: string; name: string; sku?: string; itemType: string }) => void;
  isLoading?: boolean;
  product?: Product | null;
}

export default function EditProductModal({ isOpen, onClose, onSubmit, isLoading = false, product }: EditProductModalProps) {
  const [formData, setFormData] = useState({
    brand: '',
    name: '',
    sku: '',
    itemType: '',
  });
  const [skuError, setSkuError] = useState('');
  const { checkSkuExists, isChecking } = useCheckSku();

  // Initialize form data when product changes
  useEffect(() => {
    if (product) {
      setFormData({
        brand: product.brand || '',
        name: product.name || '',
        sku: product.sku || '',
        itemType: product.itemType || '',
      });
      setSkuError('');
    }
  }, [product]);

  // Check SKU uniqueness for manual input, and only on change
  const handleSkuChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData({ ...formData, sku: value });
    setSkuError('');
    
    if (value && value.length >= 3 && value !== product?.sku) {
      const exists = await checkSkuExists(value);
      if (exists) {
        setSkuError('This SKU already exists. Please choose a different one.');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!product) return;

    // Final validation before submit
    if (formData.sku && formData.sku !== product.sku) {
      const exists = await checkSkuExists(formData.sku);
      if (exists) {
        setSkuError('This SKU already exists. Please choose a different one.');
        return;
      }
    }

    onSubmit(product.id, {
      brand: formData.brand,
      name: formData.name,
      sku: formData.sku || undefined,
      itemType: formData.itemType,
    });
  };

  const handleClose = () => {
    setFormData({ brand: '', name: '', sku: '', itemType: 'SHOE' as 'SHOE' | 'APPAREL' | 'ACCESSORIES' });
    setSkuError('');
    onClose();
  };

  if (!product) return null;

  return (
    <Modal open={isOpen} onClose={handleClose}>
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">Edit Product</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
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



          <div>
            <label htmlFor="itemType" className="block text-sm font-medium text-foreground mb-1">
              Item Type *
            </label>
            <Input
              id="itemType"
              type="text"
              value={formData.itemType}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, itemType: e.target.value })}
              placeholder="e.g., Shoe, Apparel, Accessories, Hat, Bag, etc."
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              Enter any item type. Shoe & Apparel items typically have sizes. Accessories items (caps, bags, accessories) usually don't have sizes.
            </p>
          </div>

          <div>
            <label htmlFor="sku" className="block text-sm font-medium text-foreground mb-1">
              SKU
            </label>
            <Input
              id="sku"
              type="text"
              value={formData.sku}
              onChange={handleSkuChange}
              placeholder="e.g., AB1234"
            />
            {skuError && (
              <p className="text-sm text-red-600 mt-1">{skuError}</p>
            )}
            {isChecking && (
              <p className="text-sm text-blue-600 mt-1">Checking SKU availability...</p>
            )}
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={isLoading}
              disabled={isLoading || !!skuError}
            >
              {isLoading ? 'Updating...' : 'Update Product'}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
} 
