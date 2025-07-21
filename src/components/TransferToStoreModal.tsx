import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import Button from './Button';
import Input from './Input';
import Select from './Select';

interface TransferToStoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { inventoryItemId: string; storeId: string; quantity: number; transferCost: number; notes?: string }) => void;
  isLoading?: boolean;
  inventoryItems: Array<{
    id: string;
    sku: string;
    size: string;
    condition: string;
    cost: number;
    quantity: number;
    product: {
      brand: string;
      name: string;
      stocklabSku?: string;
    };
  }>;
  stores: Array<{
    id: string;
    name: string;
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
  const [selectedInventoryItem, setSelectedInventoryItem] = useState('');
  const [selectedStore, setSelectedStore] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [transferCost, setTransferCost] = useState('');
  const [notes, setNotes] = useState('');

  const selectedItem = inventoryItems.find(item => item.id === selectedInventoryItem);

  useEffect(() => {
    if (selectedItem) {
      // Auto-populate transfer cost with warehouse cost + 10% markup
      const markup = parseFloat(selectedItem.cost.toString()) * 0.1;
      const suggestedCost = parseFloat(selectedItem.cost.toString()) + markup;
      setTransferCost(suggestedCost.toFixed(2));
    }
  }, [selectedItem]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedInventoryItem || !selectedStore || !quantity || !transferCost) {
      return;
    }

    onSubmit({
      inventoryItemId: selectedInventoryItem,
      storeId: selectedStore,
      quantity: parseInt(quantity.toString()),
      transferCost: parseFloat(transferCost),
      notes: notes.trim() || undefined
    });
  };

  const handleClose = () => {
    setSelectedInventoryItem('');
    setSelectedStore('');
    setQuantity(1);
    setTransferCost('');
    setNotes('');
    onClose();
  };

  return (
    <Modal open={isOpen} onClose={handleClose}>
      <div className="w-full">
        <h2 className="text-xl font-bold mb-4">Transfer to Store</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Inventory Item *</label>
              <Select
                value={selectedInventoryItem}
                onChange={(e) => setSelectedInventoryItem(e.target.value)}
                required
              >
                <option value="">Select Item</option>
                {inventoryItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.product.brand} {item.product.name} - {item.size} ({item.condition}) | Cost: ${item.cost} | Qty: {item.quantity}
                  </option>
                ))}
              </Select>
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Quantity *</label>
              <Input
                type="number"
                min="1"
                max={selectedItem?.quantity || 1}
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                required
              />
              {selectedItem && (
                <p className="text-xs text-muted-foreground mt-1">
                  Available: {selectedItem.quantity}
                </p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Store Cost *</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={transferCost}
                onChange={(e) => setTransferCost(e.target.value)}
                required
              />
              {selectedItem && (
                <p className="text-xs text-muted-foreground mt-1">
                  Warehouse Cost: ${selectedItem.cost}
                </p>
              )}
            </div>
          </div>

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
              disabled={isLoading || !selectedInventoryItem || !selectedStore || !quantity || !transferCost}
              className="flex-1"
            >
              {isLoading ? 'Transferring...' : 'Transfer to Store'}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
} 