import React, { useState, useEffect, useRef } from 'react';
import Modal from './Modal';
import Button from './Button';
import Input from './Input';
import Select from './Select';

interface TransferToStoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { items: Array<{ inventoryItemId: string; transferCost: number }>; storeId: string; notes?: string }) => void;
  isLoading?: boolean;
  inventoryItems: Array<{
    id: string;
    sku: string;
    stocklabSku?: string;
    size: string;
    condition: string;
    cost: number;
    quantity: number;
    product: {
      brand: string;
      name: string;
    };
  }>;
  stores: Array<{
    id: string;
    name: string;
    storeSkuBase?: string;
  }>;
}

export default function TransferToStoreModal({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
  inventoryItems,
  stores
}: TransferToStoreModalProps) {
  const [selectedItems, setSelectedItems] = useState<Array<{ id: string; transferCost: string }>>([]);
  const [selectedStore, setSelectedStore] = useState('');
  const [notes, setNotes] = useState('');
  const [skuSearch, setSkuSearch] = useState('');
  const [showSkuDropdown, setShowSkuDropdown] = useState(false);
  const [filteredItems, setFilteredItems] = useState<typeof inventoryItems>([]);
  const [selectedItemIndex, setSelectedItemIndex] = useState(-1);
  const [generatedStoreSku, setGeneratedStoreSku] = useState('');
  const skuSearchRef = useRef<HTMLInputElement>(null);

  const selectedItemsData = selectedItems.map(item => 
    inventoryItems.find(invItem => invItem.id === item.id)
  ).filter(Boolean);

  // Auto-populate transfer cost for newly selected items
  const addItemWithDefaultCost = (item: typeof inventoryItems[0]) => {
    const markup = parseFloat(item.cost.toString()) * 0.1;
    const suggestedCost = parseFloat(item.cost.toString()) + markup;
    return { id: item.id, transferCost: suggestedCost.toFixed(2) };
  };

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

  // Calculate generated store SKU when store is selected
  useEffect(() => {
    if (selectedStore) {
      const store = stores.find(s => s.id === selectedStore);
      if (store?.storeSkuBase) {
        // For preview purposes, we'll show the next number
        // The actual number will be calculated on the server
        setGeneratedStoreSku(`${store.storeSkuBase}${selectedItems.length + 1}`);
      } else {
        setGeneratedStoreSku('');
      }
    } else {
      setGeneratedStoreSku('');
    }
  }, [selectedStore, stores, selectedItems.length]);

  // Handle keyboard navigation
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

  const selectItem = (item: typeof inventoryItems[0]) => {
    // Check if item is already selected
    if (selectedItems.some(selected => selected.id === item.id)) {
      return; // Already selected
    }
    
    const newItem = addItemWithDefaultCost(item);
    setSelectedItems(prev => [...prev, newItem]);
    setSkuSearch('');
    setShowSkuDropdown(false);
    setSelectedItemIndex(-1);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedItems.length === 0 || !selectedStore) {
      return;
    }

    onSubmit({
      items: selectedItems.map(item => ({
        inventoryItemId: item.id,
        transferCost: parseFloat(item.transferCost)
      })),
      storeId: selectedStore,
      notes: notes.trim() || undefined
    });
  };

  const handleClose = () => {
    setSelectedItems([]);
    setSelectedStore('');
    setNotes('');
    setSkuSearch('');
    setShowSkuDropdown(false);
    setSelectedItemIndex(-1);
    onClose();
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Check if the click target is within the dropdown container
      const dropdownContainer = document.querySelector('.sku-dropdown-container');
      if (skuSearchRef.current && 
          !skuSearchRef.current.contains(event.target as Node) &&
          !dropdownContainer?.contains(event.target as Node)) {
        setShowSkuDropdown(false);
        setSelectedItemIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <Modal open={isOpen} onClose={handleClose}>
      <div className="w-full">
        <h2 className="text-xl font-bold mb-4">Transfer to Store</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="relative">
              <label className="block text-sm font-medium mb-1">StockLab SKU *</label>
              <input
                ref={skuSearchRef}
                type="text"
                value={skuSearch}
                onChange={(e) => setSkuSearch(e.target.value)}
                onKeyDown={handleSkuSearchKeyDown}
                placeholder="Search by StockLab SKU..."
                className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              {showSkuDropdown && filteredItems.length > 0 && (
                <div className="sku-dropdown-container absolute z-50 w-full mt-1 bg-background border border-border rounded-md shadow-lg max-h-60 overflow-y-auto">
                  {filteredItems.map((item, index) => (
                    <button
                      key={item.id}
                      type="button"
                      className={`w-full text-left px-3 py-2 cursor-pointer hover:bg-accent ${
                        index === selectedItemIndex ? 'bg-primary/10' : ''
                      }`}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        selectItem(item);
                      }}
                    >
                      <div className="font-medium text-sm text-foreground">
                        {item.stocklabSku || item.sku}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {item.product.brand} {item.product.name} - {item.size} ({item.condition})
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Cost: ${item.cost}
                      </div>
                    </button>
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
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Store *</label>
              <Select
                value={selectedStore}
                onChange={(e) => setSelectedStore(e.target.value)}
                required
              >
                <option value="">Select Store</option>
                {stores.map((store) => (
                  <option key={store.id} value={store.id}>
                    {store.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {generatedStoreSku && (
            <div>
              <label className="block text-sm font-medium mb-1">Generated Store SKU</label>
              <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                <span className="font-mono text-sm text-green-600">{generatedStoreSku}</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                This SKU will be automatically assigned to the transferred items
              </p>
            </div>
          )}

          {selectedItems.length > 0 && (
            <div>
              <label className="block text-sm font-medium mb-1">Selected Items</label>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {selectedItems.map((item, index) => {
                  const itemData = inventoryItems.find(invItem => invItem.id === item.id);
                  return (
                    <div key={item.id} className="flex items-center gap-2 p-2 border rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium text-sm">
                          {itemData?.stocklabSku || itemData?.sku}
                        </div>
                        <div className="text-xs text-gray-600">
                          {itemData?.product.brand} {itemData?.product.name} - {itemData?.size} ({itemData?.condition})
                        </div>
                        <div className="text-xs text-gray-500">
                          Warehouse Cost: ${itemData?.cost}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.transferCost}
                          onChange={(e) => {
                            setSelectedItems(prev => 
                              prev.map((selectedItem, i) => 
                                i === index 
                                  ? { ...selectedItem, transferCost: e.target.value }
                                  : selectedItem
                              )
                            );
                          }}
                          className="w-20 px-2 py-1 border rounded text-sm"
                          placeholder="Cost"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedItems(prev => prev.filter((_, i) => i !== index));
                          }}
                          className="text-red-500 hover:text-red-700 text-sm"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              rows={3}
              placeholder="Optional notes about this transfer..."
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || selectedItems.length === 0 || !selectedStore}
              className="flex-1"
            >
              {isLoading ? 'Transferring...' : `Transfer ${selectedItems.length} Item${selectedItems.length !== 1 ? 's' : ''} to Store`}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
} 