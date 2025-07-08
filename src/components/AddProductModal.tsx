'use client';

import { useState, useEffect } from 'react';
import Modal from './Modal';
import Button from './Button';
import Input from './Input';
import useCheckSku from '@/hooks/useCheckSku';

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (product: { brand: string; name: string; color?: string; sku?: string; itemType: 'SHOE' | 'APPAREL' }) => void;
  isLoading?: boolean;
}

function generateSkuPattern() {
  // 2 random uppercase letters + 4 random digits
  const letters = Array.from({ length: 2 }, () => String.fromCharCode(65 + Math.floor(Math.random() * 26))).join('');
  const digits = Math.floor(1000 + Math.random() * 9000).toString();
  return `${letters}${digits}`;
}

export default function AddProductModal({ isOpen, onClose, onSubmit, isLoading = false }: AddProductModalProps) {
  const [formData, setFormData] = useState({
    brand: '',
    name: '',
    color: '',
    sku: '',
    itemType: 'SHOE' as 'SHOE' | 'APPAREL',
  });
  const [autoSku, setAutoSku] = useState(true);
  const [skuError, setSkuError] = useState('');
  const { checkSkuExists, isChecking } = useCheckSku();
  const [generatedSku, setGeneratedSku] = useState('');

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Final validation before submit
    if (currentSku) {
      const exists = await checkSkuExists(currentSku);
      if (exists) {
        setSkuError('This SKU already exists. Please choose a different one.');
        return;
      }
    }
    const sku = currentSku;
    onSubmit({
      brand: formData.brand,
      name: formData.name,
      color: formData.color || undefined,
      sku,
      itemType: formData.itemType,
    });
  };

  const handleClose = () => {
    setFormData({ brand: '', name: '', color: '', sku: '', itemType: 'SHOE' as 'SHOE' | 'APPAREL' });
    setAutoSku(true);
    setSkuError('');
    setGeneratedSku('');
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
    <Modal open={isOpen} onClose={handleClose}>
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">Add New Product</h2>
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
            <label htmlFor="color" className="block text-sm font-medium text-foreground mb-1">
              Color
            </label>
            <Input
              id="color"
              type="text"
              value={formData.color}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, color: e.target.value })}
              placeholder="e.g., Red/Black, White/Black"
            />
          </div>

          <div>
            <label htmlFor="itemType" className="block text-sm font-medium text-foreground mb-1">
              Item Type *
            </label>
            <select
              id="itemType"
              value={formData.itemType}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, itemType: e.target.value as 'SHOE' | 'APPAREL' })}
              className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              required
            >
              <option value="SHOE">Shoe</option>
              <option value="APPAREL">Apparel</option>
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

          <div className="flex justify-end space-x-3 pt-4">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" loading={isLoading} disabled={!!skuError}>
              {isLoading ? 'Adding...' : 'Add Product'}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
} 