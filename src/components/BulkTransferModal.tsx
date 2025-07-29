import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import Button from './Button';
import Select from './Select';

interface BulkTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { 
    items: Array<{ 
      inventoryItemId: string; 
      transferCost: number; 
      storeSku?: string;
    }>; 
    storeId: string; 
    notes?: string;
  }) => void;
  onRemoveItem?: (itemId: string) => void;
  isLoading?: boolean;
  selectedItems: Array<{
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

export default function BulkTransferModal({
  isOpen,
  onClose,
  onSubmit,
  onRemoveItem,
  isLoading = false,
  selectedItems,
  stores
}: BulkTransferModalProps) {
  const [selectedStore, setSelectedStore] = useState('');
  const [notes, setNotes] = useState('');
  const [transferItems, setTransferItems] = useState<Array<{
    inventoryItemId: string;
    transferCost: number;
    storeSku: string;
  }>>([]);

  // Initialize transfer items when modal opens
  useEffect(() => {
    if (isOpen && selectedItems.length > 0) {
      const initialItems = selectedItems.map(item => {
        return {
          inventoryItemId: item.id,
          transferCost: 0,
          storeSku: ''
        };
      });
      setTransferItems(initialItems);
    }
  }, [isOpen, selectedItems]);

  // Auto-generate store SKUs when store is selected
  useEffect(() => {
    const generateStoreSkus = async () => {
      if (selectedStore && transferItems.length > 0) {
        const store = stores.find(s => s.id === selectedStore);
        if (store?.storeSkuBase) {
          try {
            // Fetch current count of items in the store
            const response = await fetch(`/api/stores/${selectedStore}/inventory`);
            if (response.ok) {
              const storeInventory = await response.json();
              const existingCount = Array.isArray(storeInventory) ? storeInventory.length : 0;
              
              const updatedItems = transferItems.map((item, index) => {
                const sequence = (existingCount + index + 1).toString().padStart(3, '0');
                return {
                  ...item,
                  storeSku: `${store.storeSkuBase}${sequence}`
                };
              });
              setTransferItems(updatedItems);
            }
          } catch (error) {
            console.error('Failed to fetch store inventory count:', error);
            // Fallback to simple sequence if API call fails
            const updatedItems = transferItems.map((item, index) => {
              const sequence = (index + 1).toString().padStart(3, '0');
              return {
                ...item,
                storeSku: `${store.storeSkuBase}${sequence}`
              };
            });
            setTransferItems(updatedItems);
          }
        } else {
          // Clear store SKUs if no base
          const updatedItems = transferItems.map(item => ({
            ...item,
            storeSku: ''
          }));
          setTransferItems(updatedItems);
        }
      }
    };

    generateStoreSkus();
  }, [selectedStore, stores, transferItems.length]);

  const handleTransferCostChange = (itemId: string, newCost: string) => {
    setTransferItems(prev => 
      prev.map(item => 
        item.inventoryItemId === itemId 
          ? { ...item, transferCost: parseFloat(newCost) || 0 }
          : item
      )
    );
  };

  const handleStoreSkuChange = (itemId: string, newSku: string) => {
    setTransferItems(prev => 
      prev.map(item => 
        item.inventoryItemId === itemId 
          ? { ...item, storeSku: newSku }
          : item
      )
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (transferItems.length === 0 || !selectedStore) {
      return;
    }



    try {
      await onSubmit({
        items: transferItems.map(item => ({
          inventoryItemId: item.inventoryItemId,
          transferCost: item.transferCost,
          storeSku: item.storeSku || undefined
        })),
        storeId: selectedStore,
        notes: notes.trim() || undefined
      });
    } catch (error) {
      console.error('Transfer failed:', error);
    }
  };

  const handleClose = () => {
    setSelectedStore('');
    setNotes('');
    setTransferItems([]);
    onClose();
  };

  // Reset all data when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedStore('');
      setNotes('');
      setTransferItems([]);
    }
  }, [isOpen]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <Modal open={isOpen} onClose={handleClose} width="6xl">
      <div className="w-full">
        <h2 className="text-xl font-bold mb-4">
          Transfer to Store ({selectedItems.length} items selected)
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
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
            
            <div>
              <label className="block text-sm font-medium mb-1">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                rows={2}
                placeholder="Optional notes about this transfer..."
              />
            </div>
          </div>

          {selectedItems.length > 0 && (
            <div>
              <label className="block text-sm font-medium mb-3">Selected Items</label>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 px-3 font-medium text-gray-600">Product</th>
                      <th className="text-left py-2 px-3 font-medium text-gray-600">SKU</th>
                      <th className="text-left py-2 px-3 font-medium text-gray-600">SL SKU</th>
                      <th className="text-left py-2 px-3 font-medium text-gray-600">Size</th>
                      <th className="text-left py-2 px-3 font-medium text-gray-600">Condition</th>
                      <th className="text-left py-2 px-3 font-medium text-gray-600">Cost</th>
                      <th className="text-left py-2 px-3 font-medium text-gray-600">Store SKU</th>
                      <th className="text-left py-2 px-3 font-medium text-gray-600 w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedItems.map((item, index) => {
                      const transferItem = transferItems.find(t => t.inventoryItemId === item.id);
                      return (
                        <tr key={item.id} className="border-b border-gray-100">
                          <td className="py-2 px-3">
                            <div>
                              <p className="font-medium text-foreground">
                                {item.product.brand} {item.product.name}
                              </p>
                              {item.stocklabSku && (
                                <p className="font-medium text-foreground font-mono">
                                  SL: {item.stocklabSku}
                                </p>
                              )}
                            </div>
                          </td>
                                                     <td className="py-2 px-3 text-foreground font-mono">{item.sku}</td>
                           <td className="py-2 px-3 text-foreground font-mono text-blue-600">{item.stocklabSku || 'N/A'}</td>
                           <td className="py-2 px-3 text-foreground">{item.size}</td>
                          <td className="py-2 px-3 text-foreground">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              item.condition === 'NEW' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {item.condition === 'NEW' ? 'New' : 'Pre-owned'}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-foreground">{formatCurrency(item.cost)}</td>
                                                     <td className="py-2 px-3">
                             <input
                               type="text"
                               value={transferItem?.storeSku || ''}
                               onChange={(e) => handleStoreSkuChange(item.id, e.target.value)}
                               className="w-20 px-2 py-1 border rounded text-sm"
                               placeholder="Optional"
                             />
                           </td>
                           <td className="py-2 px-3">
                             {onRemoveItem && (
                               <button
                                 type="button"
                                 onClick={() => onRemoveItem(item.id)}
                                 className="text-red-500 hover:text-red-700 text-sm font-medium"
                                 title="Remove from transfer list"
                               >
                                 ✕
                               </button>
                             )}
                           </td>
                         </tr>
                       );
                     })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="flex-1"
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                isLoading || 
                transferItems.length === 0 || 
                !selectedStore
              }
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