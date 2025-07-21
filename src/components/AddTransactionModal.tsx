'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { StockInIcon, StockOutIcon, MoveIcon, ReturnIcon, AuditIcon, WarningIcon } from '@/utils/icons';

interface InventoryItem {
  id: string;
  productId: string;
  sku: string;
  size: string;
  condition: string;
  cost: number;
  status: string;
  quantity: number;
  product: {
    id: string;
    brand: string;
    name: string;
    color: string;
    sku: string;
  };
}

interface Store {
  id: string;
  name: string;
  status: string;
}

interface TransactionItem {
  id: string;
  type: 'OUT' | 'RETURN';
  inventoryItemId: string;
  quantity: number;
  date: string;
  storeId: string;
  notes: string;
}

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    type: 'OUT' | 'RETURN';
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
  { value: 'OUT', label: 'Stock Out', icon: <StockOutIcon /> },
  { value: 'RETURN', label: 'Return', icon: <ReturnIcon /> },
];

export default function AddTransactionModal({ 
  isOpen, 
  onClose, 
  onSubmit, 
  isLoading, 
  inventoryItems 
}: AddTransactionModalProps) {
  const { user, getAuthToken } = useAuth();
  const [formData, setFormData] = useState<{
    type: 'OUT' | 'RETURN';
    inventoryItemId: string;
    quantity: number;
    date: string;
    storeId: string;
    notes: string;
  }>({
    type: 'OUT',
    inventoryItemId: '',
    quantity: 1,
    date: new Date().toISOString().split('T')[0],
    storeId: '',
    notes: '',
  });
  const [stores, setStores] = useState<Store[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [transactionList, setTransactionList] = useState<TransactionItem[]>([]);
  const [isSubmittingAll, setIsSubmittingAll] = useState(false);

  const selectedInventoryItem = Array.isArray(inventoryItems) ? inventoryItems.find(item => item.id === formData.inventoryItemId) : undefined;

  // Fetch stores on component mount
  useEffect(() => {
    const fetchStores = async () => {
      try {
        const token = await getAuthToken();
        if (!token) {
          
          setStores([]);
          return;
        }

        const response = await fetch('/api/stores', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          
          setStores([]);
          return;
        }

        const data = await response.json();
        
        // Ensure data is an array and not empty object
        if (Array.isArray(data) && data.length > 0) {
          setStores(data);
        } else if (Array.isArray(data)) {
          // Empty array is fine
          setStores([]);
        } else {
          
          setStores([]);
        }
      } catch (error) {
        
        setStores([]);
      }
    };

    if (isOpen) {
      fetchStores();
    }
  }, [isOpen]); // Removed getAuthToken from dependency array

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

  const handleAddToList = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const newTransaction: TransactionItem = {
      id: Date.now().toString(),
      type: formData.type,
      inventoryItemId: formData.inventoryItemId,
      quantity: formData.quantity,
      date: formData.date,
      storeId: formData.storeId,
      notes: formData.notes,
    };

    setTransactionList([...transactionList, newTransaction]);
    
    // Reset form for next transaction
    setFormData({
      type: 'OUT',
      inventoryItemId: '',
      quantity: 1,
      date: new Date().toISOString().split('T')[0],
      storeId: '',
      notes: '',
    });
    setErrors({});
  };

  const handleRemoveFromList = (id: string) => {
    setTransactionList(transactionList.filter(transaction => transaction.id !== id));
  };

  const handleSubmitAll = async () => {
    if (transactionList.length === 0) {
      alert('Please add at least one transaction before submitting.');
      return;
    }

    setIsSubmittingAll(true);
    try {
      for (const transaction of transactionList) {
        await onSubmit({
          ...transaction,
          userId: user?.id,
        });
      }
      onClose();
      setTransactionList([]);
      setFormData({
        type: 'OUT',
        inventoryItemId: '',
        quantity: 1,
        date: new Date().toISOString().split('T')[0],
        storeId: '',
        notes: '',
      });
      setErrors({});
    } catch (error) {
      console.error('Error submitting transactions:', error);
    } finally {
      setIsSubmittingAll(false);
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
      <div className="relative w-5xl max-h-[90vh] bg-white rounded-lg shadow-xl border border-gray-200 flex flex-col">
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
        <div className="flex-1 overflow-y-auto p-6">
          <form onSubmit={handleAddToList} className="space-y-4">
          {/* Row 1: Transaction Type, Inventory Item, Quantity */}
          <div className="grid grid-cols-3 gap-4">
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
                    {type.label}
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
                    {item.product.brand} - {item.product.name} | SKU: {item.sku} | Size: {item.size} | Cost: ${item.cost} | Qty: {item.quantity}
                  </option>
                ))}
              </select>
              {errors.inventoryItemId && (
                <p className="mt-1 text-sm text-red-600">{errors.inventoryItemId}</p>
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
            </div>
          </div>

          {/* Row 2: Date, Store, Notes */}
          <div className="grid grid-cols-3 gap-4">
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="">Select a store</option>
                {Array.isArray(stores) && stores.map(store => (
                  <option key={store.id} value={store.id}>
                    {store.name}
                  </option>
                ))}
              </select>
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
          </div>

          {/* Stock Warning - Full Width */}
          {selectedInventoryItem && formData.type === 'OUT' && selectedInventoryItem.quantity === 0 && (
            <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">
                <WarningIcon /> This inventory item is out of stock. You cannot create an OUT transaction for an item with 0 quantity.
              </p>
            </div>
          )}

          {/* Current Stock Info - Full Width */}
          {selectedInventoryItem && (
            <div className="mt-2">
              <p className={`text-sm ${
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
            </div>
          )}

          {/* Buttons */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="submit"
              disabled={isLoading || isSubmittingAll}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Adding...' : 'Add to List'}
            </button>
          </div>
        </form>
          {/* Transaction List */}
          {transactionList.length > 0 && (
            <div className="mt-6 border-t border-gray-200 pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Transaction List ({transactionList.length})</h3>
            </div>
            
            <div className="space-y-3 max-h-40 overflow-y-auto">
              {transactionList.map((transaction, index) => {
                const inventoryItem = inventoryItems.find(item => item.id === transaction.inventoryItemId);
                const store = stores.find(s => s.id === transaction.storeId);
                
                return (
                  <div key={transaction.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">
                          {transaction.type === 'OUT' ? 'Stock Out' : 'Return'}
                        </span>
                        <span className="text-gray-500">•</span>
                        <span className="text-sm text-gray-600">
                          {inventoryItem ? `${inventoryItem.product.brand} - ${inventoryItem.product.name}` : 'Unknown Item'}
                        </span>
                        <span className="text-gray-500">•</span>
                        <span className="text-sm text-gray-600">
                          Qty: {transaction.quantity}
                        </span>
                        {store && (
                          <>
                            <span className="text-gray-500">•</span>
                            <span className="text-sm text-gray-600">
                              Store: {store.name}
                            </span>
                          </>
                        )}
                      </div>
                      {transaction.notes && (
                        <div className="text-sm text-gray-500 mt-1">
                          Notes: {transaction.notes}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveFromList(transaction.id)}
                      className="ml-2 p-1 text-red-500 hover:text-red-700 transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Submit All Button */}
            <div className="flex justify-end space-x-3 mt-4 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading || isSubmittingAll}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitAll}
                disabled={isLoading || isSubmittingAll}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {isSubmittingAll ? 'Submitting...' : `Submit All (${transactionList.length})`}
              </button>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
} 
