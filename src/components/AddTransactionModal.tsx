'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import PromptModal from './PromptModal';
import { StockInIcon, StockOutIcon, MoveIcon, ReturnIcon, AuditIcon, WarningIcon } from '@/utils/icons';

interface InventoryItem {
  id: string;
  productId: string;
  sku: string;
  stocklabSku?: string;
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
  
  // SKU search states
  const [skuSearch, setSkuSearch] = useState('');
  const [showSkuDropdown, setShowSkuDropdown] = useState(false);
  const [filteredItems, setFilteredItems] = useState<InventoryItem[]>([]);
  const [selectedItemIndex, setSelectedItemIndex] = useState(-1);
  const skuSearchRef = useRef<HTMLInputElement>(null);

  const selectedInventoryItem = Array.isArray(inventoryItems) ? inventoryItems.find(item => item.id === formData.inventoryItemId) : undefined;

  // Filter items based on SKU search
  useEffect(() => {
    if (skuSearch.trim()) {
      const filtered = inventoryItems.filter(item => 
        item.stocklabSku?.toLowerCase().includes(skuSearch.toLowerCase()) ||
        item.sku.toLowerCase().includes(skuSearch.toLowerCase())
      );
      setFilteredItems(filtered);
      setShowSkuDropdown(true);
      setSelectedItemIndex(-1);
    } else {
      setFilteredItems([]);
      setShowSkuDropdown(false);
    }
  }, [skuSearch, inventoryItems]);

  // Handle keyboard navigation for SKU search
  const handleSkuSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedItemIndex(prev => 
        prev < filteredItems.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedItemIndex(prev => 
        prev > 0 ? prev - 1 : filteredItems.length - 1
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedItemIndex >= 0 && filteredItems[selectedItemIndex]) {
        selectItem(filteredItems[selectedItemIndex]);
      }
    } else if (e.key === 'Escape') {
      setShowSkuDropdown(false);
      setSelectedItemIndex(-1);
    }
  };

  const selectItem = (item: InventoryItem) => {
    setFormData(prev => ({ ...prev, inventoryItemId: item.id }));
    setSkuSearch(item.stocklabSku || item.sku);
    setShowSkuDropdown(false);
    setSelectedItemIndex(-1);
    // Clear inventory item error when item is selected
    setErrors(prev => ({ ...prev, inventoryItemId: '' }));
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (skuSearchRef.current && !skuSearchRef.current.contains(event.target as Node)) {
        setShowSkuDropdown(false);
        setSelectedItemIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

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
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const storesData = await response.json();
          setStores(storesData.filter((store: Store) => store.status === 'ACTIVE'));
        } else {
          setStores([]);
        }
      } catch (error) {
        console.error('Error fetching stores:', error);
        setStores([]);
      }
    };

    if (isOpen) {
      fetchStores();
    }
  }, [isOpen, getAuthToken]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.inventoryItemId) {
      newErrors.inventoryItemId = 'Please select an inventory item';
    }

    if (!formData.storeId) {
      newErrors.storeId = 'Please select a store';
    }

    if (formData.quantity <= 0) {
      newErrors.quantity = 'Quantity must be greater than 0';
    } else if (selectedInventoryItem && formData.quantity > selectedInventoryItem.quantity) {
      newErrors.quantity = `Insufficient stock. Available: ${selectedInventoryItem.quantity}`;
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

    setTransactionList(prev => [...prev, newTransaction]);
    
    // Reset form
    setFormData({
      type: 'OUT',
      inventoryItemId: '',
      quantity: 1,
      date: new Date().toISOString().split('T')[0],
      storeId: '',
      notes: '',
    });
    setSkuSearch('');
    setErrors({});
  };

  const handleRemoveFromList = (id: string) => {
    setTransactionList(prev => prev.filter(item => item.id !== id));
  };

  const [missingSkuBasePrompt, setMissingSkuBasePrompt] = useState(false);

  const handleSubmitAll = async () => {
    if (transactionList.length === 0) {
      return;
    }

    setIsSubmittingAll(true);
    try {
      for (const transaction of transactionList) {
        try {
          await onSubmit({
            type: transaction.type,
            inventoryItemId: transaction.inventoryItemId,
            quantity: transaction.quantity,
            date: transaction.date,
            storeId: transaction.storeId,
            notes: transaction.notes,
          });
        } catch (err: any) {
          console.log('Transaction error:', err);
          if (err && err.code === 'MISSING_STORE_SKU_BASE') {
            setMissingSkuBasePrompt(true);
            setIsSubmittingAll(false);
            return;
          }
          // Fallback: check error message string
          if (err && err.message && err.message.includes('SKU base')) {
            setMissingSkuBasePrompt(true);
            setIsSubmittingAll(false);
            return;
          }
          throw err;
        }
      }
      setTransactionList([]);
      onClose();
    } catch (error) {
      console.error('Error submitting transactions:', error);
    } finally {
      setIsSubmittingAll(false);
    }
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear errors when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }

    // Validate quantity when it changes
    if (field === 'quantity') {
      const newQuantity = Number(value);
      if (selectedInventoryItem && newQuantity > selectedInventoryItem.quantity) {
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
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <div 
          className="absolute inset-0 bg-black/60 backdrop-blur-md"
          onClick={onClose}
        />
        
        {/* Modal */}
        <div className="relative w-5xl max-h-[90vh] bg-background rounded-lg shadow-2xl border border-white/10 backdrop-blur-sm flex flex-col animate-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border">
            <h2 className="text-lg font-semibold text-foreground">
              Add Transaction
            </h2>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground transition-colors"
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
                  className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  {transactionTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Inventory Item Selection */}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  StockLab SKU
                </label>
                <input
                  ref={skuSearchRef}
                  type="text"
                  value={skuSearch}
                  onChange={(e) => setSkuSearch(e.target.value)}
                  onKeyDown={handleSkuSearchKeyDown}
                  placeholder="Search by StockLab SKU..."
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ${
                    errors.inventoryItemId ? 'border-red-500' : 'border-input'
                  }`}
                />
                {showSkuDropdown && filteredItems.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-background border border-border rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {filteredItems.map((item, index) => (
                      <div
                        key={item.id}
                        className={`px-3 py-2 cursor-pointer hover:bg-accent ${
                          index === selectedItemIndex ? 'bg-primary/10' : ''
                        }`}
                        onMouseDown={() => selectItem(item)}
                      >
                        <div className="font-medium text-sm text-foreground">
                          {item.stocklabSku || item.sku}
                        </div>
                        <div className="font-medium text-foreground">
                          {item.product.brand} {item.product.name} - {item.size} ({item.condition})
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Cost: ${item.cost} | Available: {item.quantity}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {showSkuDropdown && filteredItems.length === 0 && skuSearch.trim() && (
                  <div className="absolute z-50 w-full mt-1 bg-background border border-border rounded-md shadow-lg">
                    <div className="px-3 py-2 text-sm text-muted-foreground">
                      No items found
                    </div>
                  </div>
                )}
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
                    errors.quantity ? 'border-red-500' : 'border-input'
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
                    errors.date ? 'border-red-500' : 'border-input'
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
      <PromptModal
        show={missingSkuBasePrompt}
        title="Store SKU Base Required"
        onClose={() => setMissingSkuBasePrompt(false)}
      >
        <div className="space-y-4">
          <p className="text-foreground">
            This store does not have a <b>Store SKU Base</b> configured.<br />
            Please edit the store and add a SKU base before transferring items.
          </p>
        </div>
      </PromptModal>
    </>
  );
} 
