import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface Product {
  id: string;
  brand: string;
  name: string;
  sku?: string;
  quantity: number;
}

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    type: 'IN' | 'OUT' | 'MOVE' | 'RETURN' | 'ADJUSTMENT' | 'AUDIT';
    productId: string;
    quantity: number;
    date: string;
    fromLocation?: string;
    toLocation?: string;
    userId?: string;
    notes?: string;
  }) => Promise<void>;
  isLoading: boolean;
  products: Product[];
}

const transactionTypes = [
  { value: 'IN', label: 'Stock In', icon: '📥' },
  { value: 'OUT', label: 'Stock Out', icon: '📤' },
  { value: 'MOVE', label: 'Move', icon: '🔄' },
  { value: 'RETURN', label: 'Return', icon: '↩️' },
  { value: 'ADJUSTMENT', label: 'Adjustment', icon: '⚖️' },
  { value: 'AUDIT', label: 'Audit', icon: '📋' },
] as const;

export default function AddTransactionModal({ 
  isOpen, 
  onClose, 
  onSubmit, 
  isLoading, 
  products 
}: AddTransactionModalProps) {
  const { user } = useAuth();
  const [formData, setFormData] = useState<{
    type: 'IN' | 'OUT' | 'MOVE' | 'RETURN' | 'ADJUSTMENT' | 'AUDIT';
    productId: string;
    quantity: number;
    date: string;
    fromLocation: string;
    toLocation: string;
    notes: string;
  }>({
    type: 'IN',
    productId: '',
    quantity: 1,
    date: new Date().toISOString().split('T')[0],
    fromLocation: '',
    toLocation: '',
    notes: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const selectedProduct = products.find(p => p.id === formData.productId);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.productId) {
      newErrors.productId = 'Product is required';
    }

    if (!formData.quantity || formData.quantity <= 0) {
      newErrors.quantity = 'Quantity must be greater than 0';
    }

    // Check if OUT transaction would exceed available stock
    if (formData.type === 'OUT' && selectedProduct && formData.quantity > selectedProduct.quantity) {
      newErrors.quantity = `Insufficient stock. Available: ${selectedProduct.quantity}`;
    }

    if (!formData.date) {
      newErrors.date = 'Date is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      await onSubmit({
        ...formData,
        userId: user?.id, // Pass the user ID from JWT
      });
      onClose();
      setFormData({
        type: 'IN',
        productId: '',
        quantity: 1,
        date: new Date().toISOString().split('T')[0],
        fromLocation: '',
        toLocation: '',
        notes: '',
      });
      setErrors({});
    } catch (error) {
      console.error('Error submitting transaction:', error);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
    
    // Real-time validation for quantity when product or quantity changes
    if ((field === 'quantity' || field === 'productId' || field === 'type') && selectedProduct) {
      const newQuantity = field === 'quantity' ? value : formData.quantity;
      const newType = field === 'type' ? value : formData.type;
      
      if (newType === 'OUT' && newQuantity > selectedProduct.quantity) {
        setErrors(prev => ({ 
          ...prev, 
          quantity: `Insufficient stock. Available: ${selectedProduct.quantity}` 
        }));
      } else if (newQuantity <= 0) {
        setErrors(prev => ({ 
          ...prev, 
          quantity: 'Quantity must be greater than 0' 
        }));
      } else {
        // Clear quantity error if validation passes
        setErrors(prev => ({ ...prev, quantity: '' }));
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-1/2 bg-white rounded-lg shadow-xl border border-gray-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Add Transaction
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Transaction Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Transaction Type
            </label>
            <select
              value={formData.type}
              onChange={(e) => handleInputChange('type', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              {transactionTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.icon} {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Product Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Product
            </label>
            <select
              value={formData.productId}
              onChange={(e) => handleInputChange('productId', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ${
                errors.productId ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="">Select a product</option>
              {products.map(product => (
                <option key={product.id} value={product.id}>
                  {product.brand} - {product.name} (Qty: {product.quantity})
                </option>
              ))}
            </select>
            {errors.productId && (
              <p className="mt-1 text-sm text-red-600">{errors.productId}</p>
            )}
            {selectedProduct && formData.type === 'OUT' && selectedProduct.quantity === 0 && (
              <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">
                  ⚠️ This product is out of stock. You cannot create an OUT transaction for a product with 0 quantity.
                </p>
              </div>
            )}
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quantity
            </label>
            <input
              type="number"
              min="1"
              value={formData.quantity}
              onChange={(e) => handleInputChange('quantity', parseInt(e.target.value) || 1)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ${
                errors.quantity ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.quantity && (
              <p className="mt-1 text-sm text-red-600">{errors.quantity}</p>
            )}
            {selectedProduct && (
              <p className={`mt-1 text-sm ${
                selectedProduct.quantity === 0 
                  ? 'text-red-600 font-medium' 
                  : selectedProduct.quantity < 5 
                    ? 'text-yellow-600 font-medium' 
                    : 'text-gray-500'
              }`}>
                Current stock: {selectedProduct.quantity}
                {selectedProduct.quantity === 0 && ' (Out of stock)'}
                {selectedProduct.quantity > 0 && selectedProduct.quantity < 5 && ' (Low stock)'}
              </p>
            )}
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date
            </label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => handleInputChange('date', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ${
                errors.date ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.date && (
              <p className="mt-1 text-sm text-red-600">{errors.date}</p>
            )}
          </div>

          {/* Location Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                From Location
              </label>
              <input
                type="text"
                value={formData.fromLocation}
                onChange={(e) => handleInputChange('fromLocation', e.target.value)}
                placeholder="Optional"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                To Location
              </label>
              <input
                type="text"
                value={formData.toLocation}
                onChange={(e) => handleInputChange('toLocation', e.target.value)}
                placeholder="Optional"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="Optional notes about this transaction"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          {/* Buttons */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Adding...' : 'Add Transaction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 