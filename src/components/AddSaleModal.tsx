import React, { useState, useEffect, useRef } from 'react';
import Modal from './Modal';
import Button from './Button';
import Input from './Input';
import Select from './Select';

interface Store {
  id: string;
  name: string;
}

interface InventoryItem {
  id: string;
  sku: string;
  stocklabSku?: string;
  size: string;
  condition: string;
  cost: number;
  product: {
    id: string;
    brand: string;
    name: string;
    sku?: string;
  };
  quantity: number;
}

interface StoreInventoryItem {
  id: string;
  storeId: string;
  inventoryItemId: string;
  quantity: number;
  inventoryItem: InventoryItem;
  store: Store;
}

interface AddSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  stores: Store[];
  fetchInventory: (storeId: string) => Promise<InventoryItem[]>;
  getAuthToken: () => Promise<string | null>;
  isLoading?: boolean;
}

const AddSaleModal: React.FC<AddSaleModalProps> = ({ isOpen, onClose, onSubmit, stores, fetchInventory, getAuthToken, isLoading }) => {
  const [storeId, setStoreId] = useState('');
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [inventoryItemId, setInventoryItemId] = useState('');
  const [cost, setCost] = useState('');
  const [payout, setPayout] = useState('');
  const [discount, setDiscount] = useState('');
  const [quantity] = useState('1'); // Always 1 since each inventory item represents one physical item
  const [notes, setNotes] = useState('');
  const [loadingInventory, setLoadingInventory] = useState(false);
  const [error, setError] = useState('');

  // SKU search states
  const [skuSearch, setSkuSearch] = useState('');
  const [showSkuDropdown, setShowSkuDropdown] = useState(false);
  const [filteredStoreItems, setFilteredStoreItems] = useState<StoreInventoryItem[]>([]);
  const [selectedItemIndex, setSelectedItemIndex] = useState(-1);
  const [allStoreInventory, setAllStoreInventory] = useState<StoreInventoryItem[]>([]);
  const [loadingAllInventory, setLoadingAllInventory] = useState(false);
  const skuSearchRef = useRef<HTMLInputElement>(null);

  // Get the selected inventory item to check available quantity
  const selectedItem = inventoryItems.find(item => item.id === inventoryItemId);
  const maxQuantity = selectedItem?.quantity || 1;

  // Fetch all store inventory for SKU search
  useEffect(() => {
    const fetchAllStoreInventory = async () => {
      if (!isOpen) return;
      
      setLoadingAllInventory(true);
      try {
        const token = await getAuthToken();
        if (!token) {
          console.error('No authentication token available');
          return;
        }
        
        const response = await fetch('/api/stores/inventory', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        if (response.ok) {
          const data = await response.json();
          setAllStoreInventory(data);
        }
      } catch (error) {
        console.error('Failed to fetch all store inventory:', error);
      } finally {
        setLoadingAllInventory(false);
      }
    };

    fetchAllStoreInventory();
  }, [isOpen, getAuthToken]);

          // Filter store inventory items based on SKU search (only available items with quantity > 0)
        useEffect(() => {
          if (skuSearch.trim()) {
            const filtered = allStoreInventory.filter(item =>
              item.quantity > 0 && (
                item.inventoryItem.stocklabSku?.toLowerCase().includes(skuSearch.toLowerCase()) ||
                item.inventoryItem.sku.toLowerCase().includes(skuSearch.toLowerCase())
              )
            );
            setFilteredStoreItems(filtered);
            setShowSkuDropdown(true);
            setSelectedItemIndex(-1);
          } else {
            setFilteredStoreItems([]);
            setShowSkuDropdown(false);
          }
        }, [skuSearch, allStoreInventory]);

  // Handle keyboard navigation for SKU search
  const handleSkuSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedItemIndex(prev => 
        prev < filteredStoreItems.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedItemIndex(prev => 
        prev > 0 ? prev - 1 : filteredStoreItems.length - 1
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedItemIndex >= 0 && filteredStoreItems[selectedItemIndex]) {
        selectStoreItem(filteredStoreItems[selectedItemIndex]);
      }
    } else if (e.key === 'Escape') {
      setShowSkuDropdown(false);
      setSelectedItemIndex(-1);
    }
  };

  const selectStoreItem = (storeItem: StoreInventoryItem) => {
    // Auto-assign store
    setStoreId(storeItem.storeId);
    setSelectedStore(storeItem.store);
    
    // Set the inventory item
    setInventoryItemId(storeItem.inventoryItemId);
    
    // Update the search display
    setSkuSearch(storeItem.inventoryItem.stocklabSku || storeItem.inventoryItem.sku);
    
    // Close dropdown
    setShowSkuDropdown(false);
    setSelectedItemIndex(-1);
    
    // Clear any errors
    setError('');
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

  useEffect(() => {
    if (storeId) {
      setLoadingInventory(true);
      fetchInventory(storeId)
        .then((items) => {
          setInventoryItems(items);
          // Don't clear inventoryItemId if it was set via SKU search
          if (!inventoryItemId) {
            setInventoryItemId('');
          }
        })
        .catch(() => setInventoryItems([]))
        .finally(() => setLoadingInventory(false));
    } else {
      setInventoryItems([]);
      setInventoryItemId('');
    }
  }, [storeId, fetchInventory]);

  // Quantity is always 1 since each inventory item represents one physical item

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!skuSearch.trim()) {
      setError('Please search and select an item by StockLab SKU.');
      return;
    }
    
    if (!storeId || !inventoryItemId || !cost || !payout || !quantity) {
      setError('Please fill in all required fields.');
      return;
    }

    const quantityNum = parseInt(quantity, 10);
    // Quantity is always 1 for individual inventory items

    try {
      await onSubmit({
        storeId,
        inventoryItemId,
        cost: parseFloat(cost),
        payout: parseFloat(payout),
        discount: discount ? parseFloat(discount) : 0,
        quantity: quantityNum,
        notes,
      });
      setStoreId('');
      setSelectedStore(null);
      setInventoryItemId('');
      setCost('');
      setPayout('');
      setDiscount('');
      setNotes('');
      setSkuSearch('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to add sale');
    }
  };

  return (
    <Modal open={isOpen} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <h2 className="text-lg font-semibold">Add Sale</h2>
        {error && <div className="text-red-600 text-sm">{error}</div>}
        
        {/* SKU Search */}
        <div className="relative">
          <label className="block text-sm font-medium mb-1">Search by StockLab SKU<span className="text-red-500">*</span></label>
          <input
            ref={skuSearchRef}
            type="text"
            value={skuSearch}
            onChange={(e) => setSkuSearch(e.target.value)}
            onKeyDown={handleSkuSearchKeyDown}
            placeholder="Search by StockLab SKU or product SKU..."
            className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          />
          {showSkuDropdown && filteredStoreItems.length > 0 && (
            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
              {filteredStoreItems.map((storeItem, index) => (
                <div
                  key={storeItem.id}
                  className={`px-3 py-2 cursor-pointer hover:bg-gray-100 ${
                    index === selectedItemIndex ? 'bg-blue-100' : ''
                  }`}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    selectStoreItem(storeItem);
                  }}
                >
                  <div className="font-medium text-sm">
                    {storeItem.inventoryItem.stocklabSku || storeItem.inventoryItem.sku}
                  </div>
                  <div className="text-xs text-gray-600">
                    {storeItem.inventoryItem.product.brand} {storeItem.inventoryItem.product.name} - {storeItem.inventoryItem.size} ({storeItem.inventoryItem.condition})
                  </div>
                  <div className="text-xs text-gray-500">
                    Store: {storeItem.store.name} | Available: {storeItem.quantity} | Cost: ${storeItem.inventoryItem.cost}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Auto-assigned Store Display */}
        {selectedStore && (
          <div>
            <label className="block text-sm font-medium mb-1">Store<span className="text-red-500">*</span></label>
            <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm">
              {selectedStore.name}
            </div>
          </div>
        )}
        <div>
          <label className="block text-sm font-medium mb-1">Inventory Item<span className="text-red-500">*</span></label>
          <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm">
            {inventoryItemId ? (
              inventoryItems.find(item => item.id === inventoryItemId) ? (
                <div>
                  <div className="font-medium">
                    {inventoryItems.find(item => item.id === inventoryItemId)?.product.brand} {inventoryItems.find(item => item.id === inventoryItemId)?.product.name}
                  </div>
                  <div className="text-xs text-gray-600">
                    SKU: {inventoryItems.find(item => item.id === inventoryItemId)?.sku} | Size: {inventoryItems.find(item => item.id === inventoryItemId)?.size} | Condition: {inventoryItems.find(item => item.id === inventoryItemId)?.condition}
                  </div>
                </div>
              ) : (
                'Loading item details...'
              )
            ) : (
              'Item will be auto-assigned when you search and select by SKU'
            )}
          </div>
        </div>
        
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1">Cost<span className="text-red-500">*</span></label>
            <Input 
              type="number" 
              min="0" 
              step="0.01" 
              value={cost} 
              onChange={e => setCost(e.target.value)} 
              required 
              placeholder="0.00"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1">Payout<span className="text-red-500">*</span></label>
            <Input 
              type="number" 
              min="0" 
              step="0.01" 
              value={payout} 
              onChange={e => setPayout(e.target.value)} 
              required 
              placeholder="0.00"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1">Discount</label>
            <Input 
              type="number" 
              min="0" 
              step="0.01" 
              value={discount} 
              onChange={e => setDiscount(e.target.value)} 
              placeholder="0.00"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1">Quantity<span className="text-red-500">*</span></label>
            <Input 
              type="number" 
              value="1" 
              readOnly
              className="bg-gray-50 cursor-not-allowed"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Each inventory item represents one physical item
            </p>
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Note</label>
          <Input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional note" />
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>Cancel</Button>
          <Button type="submit" variant="primary" loading={isLoading}>Add Sale</Button>
        </div>
      </form>
    </Modal>
  );
};

export default AddSaleModal; 
