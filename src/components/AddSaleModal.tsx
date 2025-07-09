import React, { useState, useEffect } from 'react';
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
  size: string;
  condition: string;
  product: {
    id: string;
    brand: string;
    name: string;
    sku?: string;
  };
  quantity: number;
}

interface AddSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  stores: Store[];
  fetchInventory: (storeId: string) => Promise<InventoryItem[]>;
  isLoading?: boolean;
}

const AddSaleModal: React.FC<AddSaleModalProps> = ({ isOpen, onClose, onSubmit, stores, fetchInventory, isLoading }) => {
  const [storeId, setStoreId] = useState('');
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [inventoryItemId, setInventoryItemId] = useState('');
  const [cost, setCost] = useState('');
  const [payout, setPayout] = useState('');
  const [discount, setDiscount] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [notes, setNotes] = useState('');
  const [loadingInventory, setLoadingInventory] = useState(false);
  const [error, setError] = useState('');

  // Get the selected inventory item to check available quantity
  const selectedItem = inventoryItems.find(item => item.id === inventoryItemId);
  const maxQuantity = selectedItem?.quantity || 1;

  useEffect(() => {
    if (storeId) {
      setLoadingInventory(true);
      fetchInventory(storeId)
        .then((items) => {
          setInventoryItems(items);
          setInventoryItemId('');
        })
        .catch(() => setInventoryItems([]))
        .finally(() => setLoadingInventory(false));
    } else {
      setInventoryItems([]);
      setInventoryItemId('');
    }
  }, [storeId, fetchInventory]);

  // Reset quantity when inventory item changes
  useEffect(() => {
    if (selectedItem && parseInt(quantity) > selectedItem.quantity) {
      setQuantity(selectedItem.quantity.toString());
    }
  }, [inventoryItemId, selectedItem]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!storeId || !inventoryItemId || !cost || !payout || !quantity) {
      setError('Please fill in all required fields.');
      return;
    }

    const quantityNum = parseInt(quantity, 10);
    if (quantityNum > maxQuantity) {
      setError(`Quantity cannot exceed available inventory (${maxQuantity})`);
      return;
    }

    if (quantityNum <= 0) {
      setError('Quantity must be greater than 0');
      return;
    }

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
      setInventoryItemId('');
      setCost('');
      setPayout('');
      setDiscount('');
      setQuantity('1');
      setNotes('');
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
        <div>
          <label className="block text-sm font-medium mb-1">Store<span className="text-red-500">*</span></label>
          <Select value={storeId} onChange={e => setStoreId(e.target.value)} required>
            <option value="">Select store</option>
            {stores.map(store => (
              <option key={store.id} value={store.id}>{store.name}</option>
            ))}
          </Select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Inventory Item<span className="text-red-500">*</span></label>
          <Select value={inventoryItemId} onChange={e => setInventoryItemId(e.target.value)} required disabled={!storeId || loadingInventory}>
            <option value="">{loadingInventory ? 'Loading...' : 'Select item'}</option>
            {inventoryItems.map(item => (
              <option key={item.id} value={item.id}>
                {item.product.brand} {item.product.name} | SKU: {item.sku} | Size: {item.size} | Cond: {item.condition} | Qty: {item.quantity}
              </option>
            ))}
          </Select>
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
              min="1" 
              max={maxQuantity}
              value={quantity} 
              onChange={e => setQuantity(e.target.value)} 
              required 
            />
            {selectedItem && (
              <p className="text-xs text-muted-foreground mt-1">
                Available: {maxQuantity} units
              </p>
            )}
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