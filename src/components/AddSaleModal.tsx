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
  storeSku?: string;
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
  payoutMethod: string;
  saleDate: string;
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
  preSelectedItems?: SaleItem[]; // New prop for bulk mode
}

const AddSaleModal: React.FC<AddSaleModalProps> = ({ isOpen, onClose, onSubmit, stores, fetchInventory, getAuthToken, isLoading, preSelectedItems }) => {
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [currentItem, setCurrentItem] = useState<Partial<SaleItem>>({
    storeId: '',
    inventoryItemId: '',
    cost: 0,
    payout: 0,
    discount: 0,
    quantity: 1,
    notes: '',
    payoutMethod: '',
    saleDate: new Date().toISOString().split('T')[0], // Default to today
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
    } else if (preSelectedItems && preSelectedItems.length > 0) {
      // Pre-populate with selected items in bulk mode
      setSaleItems(preSelectedItems);
    }
  }, [isOpen, preSelectedItems]);

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

      const stocklabSku = storeItem.inventoryItem.stocklabSku || '';
      const productSku = storeItem.inventoryItem.sku || '';
      const storeSku = storeItem.storeSku || '';
      const brand = storeItem.inventoryItem.product.brand;
      const name = storeItem.inventoryItem.product.name;
      const searchTerm = skuSearch.toLowerCase();
      
      return (
        stocklabSku.toLowerCase().includes(searchTerm) ||
        productSku.toLowerCase().includes(searchTerm) ||
        storeSku.toLowerCase().includes(searchTerm) ||
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
      payoutMethod: currentItem.payoutMethod || '',
      saleDate: currentItem.saleDate || new Date().toISOString().split('T')[0],
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
      payoutMethod: '',
      saleDate: new Date().toISOString().split('T')[0],
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
        payoutMethod: '',
        saleDate: new Date().toISOString().split('T')[0],
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
    <Modal open={isOpen} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-6">
        <h2 className="text-xl font-semibold">
          {preSelectedItems && preSelectedItems.length > 0 ? 'Bulk Add Sale' : 'Add Sale'}
        </h2>
        {error && <div className="text-red-600 text-sm">{error}</div>}
        
        {preSelectedItems && preSelectedItems.length > 0 ? (
          // Bulk mode - show only the sale items table
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Sale Items ({saleItems.length})</h3>
            
            <div className="overflow-x-auto max-h-96">
              <table className="w-full border-collapse">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="text-left py-2 px-3 text-xs font-medium text-gray-600 border-b">SKU</th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-gray-600 border-b">Product</th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-gray-600 border-b">Store</th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-gray-600 border-b">Cost</th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-gray-600 border-b">Payout</th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-gray-600 border-b">Discount</th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-gray-600 border-b">Payout Method</th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-gray-600 border-b">Sale Date</th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-gray-600 border-b">Notes</th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-gray-600 border-b">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {saleItems.map((item) => (
                    <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-2 px-3 text-sm">
                        <div className="font-medium text-foreground">{item.skuDisplay}</div>
                        <div className="text-xs text-muted-foreground">
                          {item.selectedItem?.product.brand} {item.selectedItem?.product.name}
                        </div>
                      </td>
                      <td className="py-2 px-3 text-sm">
                        <div className="font-medium text-foreground">
                          {item.selectedItem?.product.brand} {item.selectedItem?.product.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Size: {item.selectedItem?.size} | Condition: {item.selectedItem?.condition}
                        </div>
                      </td>
                      <td className="py-2 px-3 text-sm">
                        <span className="font-medium text-blue-600">{item.selectedStore?.name}</span>
                      </td>
                      <td className="py-2 px-3 text-sm">
                        <span className="font-mono font-medium">${item.cost}</span>
                      </td>
                      <td className="py-2 px-3 text-sm">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.payout || 0}
                          onChange={(e) => {
                            const newPayout = parseFloat(e.target.value) || 0;
                            setSaleItems(prev => 
                              prev.map(saleItem => 
                                saleItem.id === item.id 
                                  ? { ...saleItem, payout: newPayout }
                                  : saleItem
                              )
                            );
                          }}
                          className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                      </td>
                      <td className="py-2 px-3 text-sm">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.discount || 0}
                          onChange={(e) => {
                            const newDiscount = parseFloat(e.target.value) || 0;
                            setSaleItems(prev => 
                              prev.map(saleItem => 
                                saleItem.id === item.id 
                                  ? { ...saleItem, discount: newDiscount }
                                  : saleItem
                              )
                            );
                          }}
                          className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                      </td>
                      <td className="py-2 px-3 text-sm">
                        <input
                          type="text"
                          value={item.payoutMethod || ''}
                          onChange={(e) => {
                            setSaleItems(prev => 
                              prev.map(saleItem => 
                                saleItem.id === item.id 
                                  ? { ...saleItem, payoutMethod: e.target.value }
                                  : saleItem
                              )
                            );
                          }}
                          placeholder="Payout Method"
                          className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                      </td>
                      <td className="py-2 px-3 text-sm">
                        <input
                          type="date"
                          value={item.saleDate || new Date().toISOString().split('T')[0]}
                          onChange={(e) => {
                            setSaleItems(prev => 
                              prev.map(saleItem => 
                                saleItem.id === item.id 
                                  ? { ...saleItem, saleDate: e.target.value }
                                  : saleItem
                              )
                            );
                          }}
                          className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                      </td>
                      <td className="py-2 px-3 text-sm">
                        <input
                          type="text"
                          value={item.notes || ''}
                          onChange={(e) => {
                            setSaleItems(prev => 
                              prev.map(saleItem => 
                                saleItem.id === item.id 
                                  ? { ...saleItem, notes: e.target.value }
                                  : saleItem
                              )
                            );
                          }}
                          placeholder="Notes"
                          className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                      </td>
                      <td className="py-2 px-3 text-sm">
                        <button
                          type="button"
                          onClick={() => removeItemFromList(item.id)}
                          className="text-red-500 hover:text-red-700 text-sm px-2 py-1 rounded hover:bg-red-50"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

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
        ) : (
          // Normal mode - show the full interface
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - Add Item Form */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Add Item</h3>
          
          {/* SKU Search */}
          <div className="relative">
            <label className="block text-sm font-medium mb-1">Search by SKU<span className="text-red-500">*</span></label>
            <input
              ref={skuSearchRef}
              type="text"
              value={skuSearch}
              onChange={(e) => setSkuSearch(e.target.value)}
              onKeyDown={handleSkuSearchKeyDown}
              placeholder="Search by StockLab SKU, Product SKU, or Store SKU..."
              className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            {showSkuDropdown && filteredStoreItems.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-background border border-border rounded-md shadow-lg max-h-60 overflow-y-auto">
                {filteredStoreItems.map((storeItem, index) => (
                  <div
                    key={storeItem.id}
                    className={`px-3 py-2 cursor-pointer hover:bg-accent ${
                      index === selectedItemIndex ? 'bg-primary/10' : ''
                    }`}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      selectStoreItem(storeItem);
                    }}
                  >
                    <div className="font-medium text-sm text-foreground">
                      {storeItem.inventoryItem.stocklabSku || storeItem.inventoryItem.sku}
                      {storeItem.storeSku && ` (Store: ${storeItem.storeSku})`}
                    </div>
                    <div className="font-medium text-foreground">
                      {storeItem.inventoryItem.product.brand} {storeItem.inventoryItem.product.name} - {storeItem.inventoryItem.size} ({storeItem.inventoryItem.condition})
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Store: {storeItem.store.name} | Available: {storeItem.quantity} | Cost: ${storeItem.inventoryItem.cost}
                      {storeItem.storeSku && ` | Store SKU: ${storeItem.storeSku}`}
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
              <div className="px-3 py-2 bg-muted border border-border rounded-lg text-sm">
                    {currentItem.selectedStore.name}
              </div>
            </div>
          )}

              {/* Item Details Display */}
              {currentItem.selectedItem && (
          <div>
                  <label className="block text-sm font-medium mb-1">Selected Item<span className="text-red-500">*</span></label>
            <div className="px-3 py-2 bg-muted border border-border rounded-lg text-sm">
                  <div className="font-medium text-foreground">
                    {currentItem.selectedItem.product.brand} {currentItem.selectedItem.product.name}
                  </div>
                  <div className="font-medium text-foreground">
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

              <div>
                <label className="block text-sm font-medium mb-1">Payout Method</label>
                <Input 
                  type="text" 
                  value={currentItem.payoutMethod || ''} 
                  onChange={e => setCurrentItem(prev => ({ ...prev, payoutMethod: e.target.value }))} 
                  placeholder="e.g., Cash, Card, PayPal, etc." 
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Sale Date</label>
                <Input 
                  type="date" 
                  value={currentItem.saleDate || ''} 
                  onChange={e => setCurrentItem(prev => ({ ...prev, saleDate: e.target.value }))} 
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

            {/* Right Column - Sale Items Table */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Sale Items ({saleItems.length})</h3>
              
              {saleItems.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground border-2 border-dashed border-gray-200 rounded-lg">
                  <p>No items added yet</p>
                  <p className="text-sm">Search and add items from the left panel</p>
                </div>
              ) : (
                <div className="overflow-x-auto max-h-96">
                  <table className="w-full border-collapse">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="text-left py-2 px-3 text-xs font-medium text-gray-600 border-b">SKU</th>
                        <th className="text-left py-2 px-3 text-xs font-medium text-gray-600 border-b">Product</th>
                        <th className="text-left py-2 px-3 text-xs font-medium text-gray-600 border-b">Store</th>
                        <th className="text-left py-2 px-3 text-xs font-medium text-gray-600 border-b">Cost</th>
                        <th className="text-left py-2 px-3 text-xs font-medium text-gray-600 border-b">Payout</th>
                        <th className="text-left py-2 px-3 text-xs font-medium text-gray-600 border-b">Discount</th>
                        <th className="text-left py-2 px-3 text-xs font-medium text-gray-600 border-b">Notes</th>
                        <th className="text-left py-2 px-3 text-xs font-medium text-gray-600 border-b">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {saleItems.map((item) => (
                        <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-2 px-3 text-sm">
                            <div className="font-medium text-foreground">{item.skuDisplay}</div>
                            <div className="text-xs text-muted-foreground">
                              {item.selectedItem?.product.brand} {item.selectedItem?.product.name}
                            </div>
                          </td>
                          <td className="py-2 px-3 text-sm">
                            <div className="font-medium text-foreground">
                              {item.selectedItem?.product.brand} {item.selectedItem?.product.name}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Size: {item.selectedItem?.size} | Condition: {item.selectedItem?.condition}
                            </div>
                          </td>
                          <td className="py-2 px-3 text-sm">
                            <span className="font-medium text-blue-600">{item.selectedStore?.name}</span>
                          </td>
                          <td className="py-2 px-3 text-sm">
                            <span className="font-mono font-medium">${item.cost}</span>
                          </td>
                          <td className="py-2 px-3 text-sm">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.payout}
                              onChange={(e) => {
                                const newPayout = parseFloat(e.target.value) || 0;
                                setSaleItems(prev => 
                                  prev.map(saleItem => 
                                    saleItem.id === item.id 
                                      ? { ...saleItem, payout: newPayout }
                                      : saleItem
                                  )
                                );
                              }}
                              className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                            />
                          </td>
                          <td className="py-2 px-3 text-sm">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.discount}
                              onChange={(e) => {
                                const newDiscount = parseFloat(e.target.value) || 0;
                                setSaleItems(prev => 
                                  prev.map(saleItem => 
                                    saleItem.id === item.id 
                                      ? { ...saleItem, discount: newDiscount }
                                      : saleItem
                                  )
                                );
                              }}
                              className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                            />
                          </td>
                          <td className="py-2 px-3 text-sm">
                            <input
                              type="text"
                              value={item.notes}
                              onChange={(e) => {
                                setSaleItems(prev => 
                                  prev.map(saleItem => 
                                    saleItem.id === item.id 
                                      ? { ...saleItem, notes: e.target.value }
                                      : saleItem
                                  )
                                );
                              }}
                              placeholder="Notes"
                              className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                            />
                          </td>
                          <td className="py-2 px-3 text-sm">
                            <button
                              type="button"
                              onClick={() => removeItemFromList(item.id)}
                              className="text-red-500 hover:text-red-700 text-sm px-2 py-1 rounded hover:bg-red-50"
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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
        )}

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={isLoading} disabled={saleItems.length === 0}>
            {preSelectedItems && preSelectedItems.length > 0 
              ? `Create Sale (${saleItems.length} items)` 
              : `Create Sale (${saleItems.length} items)`
            }
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default AddSaleModal; 
