import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface InventoryItem {
  id: string;
  sku: string;
  size: string;
  condition: string;
  cost: number;
  payout: number;
  consigner: string;
  consignDate: string;
  status: string;
  quantity: number;
  product: {
  id: string;
  brand: string;
  name: string;
  sku?: string;
  };
}

interface Store {
  id: string;
  name: string;
  status: string;
}

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    type: 'IN' | 'OUT' | 'MOVE' | 'RETURN' | 'ADJUSTMENT' | 'AUDIT';
    inventoryItemId: string;
    quantity: number;
    date: string;
    storeId?: string;
    userId?: string;
    notes?: string;
  }) => Promise<void>;
  isLoading: boolean;
  inventoryItems: InventoryItem[];
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
  inventoryItems 
}: AddTransactionModalProps) {
  const { user } = useAuth();
  const [formData, setFormData] = useState<{
    type: 'IN' | 'OUT' | 'MOVE' | 'RETURN' | 'ADJUSTMENT' | 'AUDIT';
    inventoryItemId: string;
    quantity: number;
    date: string;
    storeId: string;
    notes: string;
  }>({
    type: 'IN',
    inventoryItemId: '',
    quantity: 1,
    date: new Date().toISOString().split('T')[0],
    storeId: '',
    notes: '',
  });
  const [stores, setStores] = useState<Store[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const selectedInventoryItem = Array.isArray(inventoryItems) ? inventoryItems.find(item => item.id === formData.inventoryItemId) : undefined;

  // Fetch stores on component mount
  useEffect(() => {
    fetch('/api/stores')
      .then(res => res.json())
      .then(data => {
        // Ensure data is an array and not empty object
        if (Array.isArray(data) && data.length > 0) {
          setStores(data);
        } else if (Array.isArray(data)) {
          // Empty array is fine
          setStores([]);
        } else {
          console.error('Stores API returned non-array data:', data);
          setStores([]);
        }
      })
      .catch(error => {
        console.error('Error fetching stores:', error);
        setStores([]);
      });
  }, []);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.inventoryItemId) {
      newErrors.inventoryItemId = 'Inventory item is required';
    }

    if (!formData.quantity || formData.quantity <= 0) {
      newErrors.quantity = 'Quantity must be greater than 0';
    }

    // Check if OUT transaction would exceed available stock
    if (formData.type === 'OUT' && selectedInventoryItem && formData.quantity > selectedInventoryItem.quantity) {
      newErrors.quantity = `Insufficient stock. Available: ${selectedInventoryItem.quantity}`;
    }

    if (!formData.date) {
      newErrors.date = 'Date is required';
    }

    // Validate store selection for OUT transactions
    if (formData.type === 'OUT' && !formData.storeId) {
      newErrors.storeId = 'Store selection is required for Stock Out transactions';
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
        inventoryItemId: '',
        quantity: 1,
        date: new Date().toISOString().split('T')[0],
        storeId: '',
        notes: '',
      });
      setErrors({});
    } catch (error) {
      console.error('Error submitting transaction:', error);
    }
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
    
    // Real-time validation for quantity when inventory item or quantity changes
    if ((field === 'quantity' || field === 'inventoryItemId' || field === 'type') && selectedInventoryItem) {
      const newQuantity = field === 'quantity' ? Number(value) : formData.quantity;
      const newType = field === 'type' ? value as string : formData.type;
      
      if (newType === 'OUT' && newQuantity > selectedInventoryItem.quantity) {
        setErrors(prev => ({ 
          ...prev, 
          quantity: `Insufficient stock. Available: ${selectedInventoryItem.quantity}` 
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

          {/* Inventory Item Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Inventory Item
            </label>
            <select
              value={formData.inventoryItemId}
              onChange={(e) => handleInputChange('inventoryItemId', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ${
                errors.inventoryItemId ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="">Select an inventory item</option>
              {Array.isArray(inventoryItems) && inventoryItems.map(item => (
                <option key={item.id} value={item.id}>
                  {item.product.brand} - {item.product.name} | SKU: {item.sku} | Size: {item.size} | Qty: {item.quantity}
                </option>
              ))}
            </select>
            {errors.inventoryItemId && (
              <p className="mt-1 text-sm text-red-600">{errors.inventoryItemId}</p>
            )}
            {selectedInventoryItem && formData.type === 'OUT' && selectedInventoryItem.quantity === 0 && (
              <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">
                  ⚠️ This inventory item is out of stock. You cannot create an OUT transaction for an item with 0 quantity.
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
            {selectedInventoryItem && (
              <p className={`mt-1 text-sm ${
                selectedInventoryItem.quantity === 0 
                  ? 'text-red-600 font-medium' 
                  : selectedInventoryItem.quantity < 5 
                    ? 'text-yellow-600 font-medium' 
                    : 'text-gray-500'
              }`}>
                Current stock: {selectedInventoryItem.quantity}
                {selectedInventoryItem.quantity === 0 && ' (Out of stock)'}
                {selectedInventoryItem.quantity > 0 && selectedInventoryItem.quantity < 5 && ' (Low stock)'}
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

          {/* Store Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
              Store
              </label>
            <select
              value={formData.storeId}
              onChange={(e) => handleInputChange('storeId', e.target.value)}
              disabled={formData.type === 'IN'}
              className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ${
                formData.type === 'IN' ? 'bg-gray-100 cursor-not-allowed' : ''
              }`}
            >
              <option value="">Select a store</option>
              {Array.isArray(stores) && stores.map(store => (
                <option key={store.id} value={store.id}>
                  {store.name}
                </option>
              ))}
            </select>
            {formData.type === 'IN' && (
              <p className="mt-1 text-sm text-gray-500">
                Store selection is disabled for Stock In transactions
              </p>
            )}
            {formData.type === 'OUT' && !formData.storeId && (
              <p className="mt-1 text-sm text-red-600">
                Store selection is required for Stock Out transactions
              </p>
            )}
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