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

interface SaleItem {
  id: string;
  storeId: string;
  inventoryItemId: string;
  cost: number;
  payout: number;
  discount: number;
  quantity: number;
  notes: string;
  selectedStore: Store | null;
  selectedItem: InventoryItem | null;
  skuDisplay: string;
}

interface AddSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: SaleItem[]) => Promise<void>;
  stores: Store[];
  fetchInventory: (storeId: string) => Promise<InventoryItem[]>;
  getAuthToken: () => Promise<string | null>;
  isLoading?: boolean;
}

const AddSaleModal: React.FC<AddSaleModalProps> = ({ isOpen, onClose, onSubmit, stores, fetchInventory, getAuthToken, isLoading }) => {
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [currentItem, setCurrentItem] = useState<Partial<SaleItem>>({
    storeId: '',
    inventoryItemId: '',
    cost: 0,
    payout: 0,
    discount: 0,
    quantity: 1,
    notes: '',
    selectedStore: null,
    selectedItem: null,
    skuDisplay: '',
  });
  const [error, setError] = useState('');

  // SKU search states
  const [skuSearch, setSkuSearch] = useState('');
  const [showSkuDropdown, setShowSkuDropdown] = useState(false);
  const [filteredStoreItems, setFilteredStoreItems] = useState<StoreInventoryItem[]>([]);
  const [selectedItemIndex, setSelectedItemIndex] = useState(-1);
  const [allStoreInventory, setAllStoreInventory] = useState<StoreInventoryItem[]>([]);
  const [loadingAllInventory, setLoadingAllInventory] = useState(false);
  const skuSearchRef = useRef<HTMLInputElement>(null);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setSaleItems([]);
      setCurrentItem({
        storeId: '',
        inventoryItemId: '',
        cost: 0,
        payout: 0,
        discount: 0,
        quantity: 1,
        notes: '',
        selectedStore: null,
        selectedItem: null,
        skuDisplay: '',
      });
      setSkuSearch('');
      setError('');
    }
  }, [isOpen]);

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

  // Filter store items based on SKU search
        useEffect(() => {
    if (!skuSearch.trim()) {
            setFilteredStoreItems([]);
            setShowSkuDropdown(false);
      return;
    }

    const filtered = allStoreInventory.filter(storeItem => {
      // Only show items with quantity > 0
      if (storeItem.quantity <= 0) {
        return false;
      }

      const sku = storeItem.inventoryItem.stocklabSku || storeItem.inventoryItem.sku;
      const brand = storeItem.inventoryItem.product.brand;
      const name = storeItem.inventoryItem.product.name;
      const searchTerm = skuSearch.toLowerCase();
      
      return (
        sku.toLowerCase().includes(searchTerm) ||
        brand.toLowerCase().includes(searchTerm) ||
        name.toLowerCase().includes(searchTerm)
      );
    });

    setFilteredStoreItems(filtered);
    setShowSkuDropdown(filtered.length > 0);
    setSelectedItemIndex(-1);
        }, [skuSearch, allStoreInventory]);

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
    setCurrentItem({
      storeId: storeItem.storeId,
      selectedStore: storeItem.store,
      inventoryItemId: storeItem.inventoryItemId,
      selectedItem: storeItem.inventoryItem,
      cost: storeItem.inventoryItem.cost,
      payout: storeItem.inventoryItem.cost, // Default payout to cost
      discount: 0,
      quantity: 1,
      notes: '',
      skuDisplay: storeItem.inventoryItem.stocklabSku || storeItem.inventoryItem.sku,
    });
    setSkuSearch(storeItem.inventoryItem.stocklabSku || storeItem.inventoryItem.sku);
    setShowSkuDropdown(false);
    setSelectedItemIndex(-1);
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

  const addItemToList = () => {
    if (!currentItem.storeId || !currentItem.inventoryItemId || !currentItem.cost) {
      setError('Please fill in all required fields for the current item.');
      return;
    }

    // Check for duplicate StockLab SKU
    const currentSku = currentItem.skuDisplay || '';
    const isDuplicate = saleItems.some(item => item.skuDisplay === currentSku);
    
    if (isDuplicate) {
      setError(`Item with StockLab SKU "${currentSku}" is already in the sale.`);
      return;
    }

    const newItem: SaleItem = {
      id: Date.now().toString(), // Simple ID for list management
      storeId: currentItem.storeId!,
      inventoryItemId: currentItem.inventoryItemId!,
      cost: currentItem.cost!,
      payout: currentItem.payout || 0,
      discount: currentItem.discount || 0,
      quantity: 1, // Always 1 since each inventory item represents one physical item
      notes: currentItem.notes || '',
      selectedStore: currentItem.selectedStore!,
      selectedItem: currentItem.selectedItem!,
      skuDisplay: currentItem.skuDisplay || '',
    };

    setSaleItems(prev => [...prev, newItem]);
    
    // Reset current item
    setCurrentItem({
      storeId: '',
      inventoryItemId: '',
      cost: 0,
      payout: 0,
      discount: 0,
      quantity: 1,
      notes: '',
      selectedStore: null,
      selectedItem: null,
      skuDisplay: '',
    });
    setSkuSearch('');
    setError('');
  };

  const removeItemFromList = (itemId: string) => {
    setSaleItems(prev => prev.filter(item => item.id !== itemId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (saleItems.length === 0) {
      setError('Please add at least one item to the sale.');
      return;
    }
    
    try {
      await onSubmit(saleItems);
      setSaleItems([]);
      setCurrentItem({
        storeId: '',
        inventoryItemId: '',
        cost: 0,
        payout: 0,
        discount: 0,
        quantity: 1,
        notes: '',
        selectedStore: null,
        selectedItem: null,
        skuDisplay: '',
      });
      setSkuSearch('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to add sale');
    }
  };

  return (
    <Modal open={isOpen} onClose={onClose} width="4xl">
      <form onSubmit={handleSubmit} className="space-y-6">
        <h2 className="text-xl font-semibold">Add Sale</h2>
        {error && <div className="text-red-600 text-sm">{error}</div>}
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Add Item Form */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Add Item</h3>
        
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
            {currentItem.selectedStore && (
          <div>
            <label className="block text-sm font-medium mb-1">Store<span className="text-red-500">*</span></label>
            <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm">
                  {currentItem.selectedStore.name}
            </div>
          </div>
        )}

            {/* Item Details Display */}
            {currentItem.selectedItem && (
        <div>
                <label className="block text-sm font-medium mb-1">Selected Item<span className="text-red-500">*</span></label>
          <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm">
                  <div className="font-medium">
                    {currentItem.selectedItem.product.brand} {currentItem.selectedItem.product.name}
                  </div>
                  <div className="text-xs text-gray-600">
                    SKU: {currentItem.selectedItem.sku} | Size: {currentItem.selectedItem.size} | Condition: {currentItem.selectedItem.condition}
                  </div>
                </div>
          </div>
            )}
        
            <div className="grid grid-cols-2 gap-2">
                              <div>
            <label className="block text-sm font-medium mb-1">Cost<span className="text-red-500">*</span></label>
            <Input 
              type="number" 
              min="0" 
              step="0.01" 
                    value={currentItem.cost || ''} 
                    onChange={e => setCurrentItem(prev => ({ ...prev, cost: parseFloat(e.target.value) || 0 }))} 
              required 
              placeholder="0.00"
                    disabled
                    className="bg-gray-50 cursor-not-allowed"
            />
          </div>
                              <div>
                  <label className="block text-sm font-medium mb-1">Payout</label>
            <Input 
              type="number" 
              min="0" 
              step="0.01" 
                    value={currentItem.payout || ''} 
                    onChange={e => setCurrentItem(prev => ({ ...prev, payout: parseFloat(e.target.value) || 0 }))} 
              placeholder="0.00"
            />
          </div>
        </div>
            
            <div className="grid grid-cols-2 gap-2">
              <div>
            <label className="block text-sm font-medium mb-1">Discount</label>
            <Input 
              type="number" 
              min="0" 
              step="0.01" 
                  value={currentItem.discount || ''} 
                  onChange={e => setCurrentItem(prev => ({ ...prev, discount: parseFloat(e.target.value) || 0 }))} 
              placeholder="0.00"
            />
          </div>
              <div>
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
              <label className="block text-sm font-medium mb-1">Notes</label>
              <Input 
                type="text" 
                value={currentItem.notes || ''} 
                onChange={e => setCurrentItem(prev => ({ ...prev, notes: e.target.value }))} 
                placeholder="Optional note" 
              />
            </div>

            <Button 
              type="button" 
              variant="outline" 
              onClick={addItemToList}
              disabled={!currentItem.storeId || !currentItem.inventoryItemId || !currentItem.cost}
              className="w-full"
            >
              Add Item to Sale
            </Button>
          </div>

          {/* Right Column - Sale Items List */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Sale Items ({saleItems.length})</h3>
            
            {saleItems.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground border-2 border-dashed border-gray-200 rounded-lg">
                <p>No items added yet</p>
                <p className="text-sm">Search and add items from the left panel</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {saleItems.map((item) => (
                  <div key={item.id} className="p-3 border border-gray-200 rounded-lg bg-gray-50">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="font-medium text-sm">
                          {item.skuDisplay}
                        </div>
                        <div className="text-xs text-gray-600">
                          {item.selectedItem?.product.brand} {item.selectedItem?.product.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          Store: {item.selectedStore?.name} | Cost: ${item.cost} | Payout: ${item.payout}
                          {item.discount > 0 && ` | Discount: $${item.discount}`}
                        </div>
                        {item.notes && (
                          <div className="text-xs text-gray-500 mt-1">
                            Note: {item.notes}
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItemFromList(item.id)}
                        className="text-red-500 hover:text-red-700 text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {saleItems.length > 0 && (
              <div className="border-t pt-4">
                <div className="text-sm text-gray-600">
                  Total Items: {saleItems.length}
                </div>
                <div className="text-sm text-gray-600">
                  Total Cost: ${saleItems.reduce((sum, item) => sum + Number(item.cost), 0).toFixed(2)}
                </div>
                <div className="text-sm text-gray-600">
                  Total Payout: ${saleItems.reduce((sum, item) => sum + Number(item.payout), 0).toFixed(2)}
                </div>
                <div className="text-sm text-gray-600">
                  Total Discount: ${saleItems.reduce((sum, item) => sum + Number(item.discount), 0).toFixed(2)}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={isLoading} disabled={saleItems.length === 0}>
            Create Sale ({saleItems.length} items)
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default AddSaleModal; 
