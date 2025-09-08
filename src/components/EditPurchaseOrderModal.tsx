'use client';

import React, { useState, useEffect, useRef } from 'react';
import Modal from './Modal';
import Button from './Button';
import Input from './Input';
import Select from './Select';
import { useAuth } from '@/contexts/AuthContext';

interface Product {
  id: string;
  brand: string;
  name: string;
  sku?: string;
}

interface PurchaseOrderItem {
  id: string;
  productId: string;
  size: string;
  condition: string;
  quantityOrdered: number;
  unitCost: number;
  totalCost: number;
  product: Product;
}

interface PurchaseOrder {
  id: string;
  vendorName: string;
  r3vPurchaseOrderNumber: string;
  orderNumber?: string;
  orderDate: string;
  deliveryDate?: string;
  status: 'DRAFT' | 'SUBMITTED' | 'DELIVERED' | 'CANCELLED';
  totalAmount: number;
  notes?: string;
  purchaseOrderItems: PurchaseOrderItem[];
}

interface EditPurchaseOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  purchaseOrder: PurchaseOrder | null;
  products: Product[];
}

export default function EditPurchaseOrderModal({
  isOpen,
  onClose,
  onSuccess,
  purchaseOrder,
  products,
}: EditPurchaseOrderModalProps) {
  const { getAuthToken } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    vendorName: '',
    r3vPurchaseOrderNumber: '',
    orderNumber: '',
    orderDate: '',
    deliveryDate: '',
    status: 'SUBMITTED',
    totalAmount: 0,
    notes: '',
  });
  const [items, setItems] = useState<PurchaseOrderItem[]>([]);
  const [productSearchTerms, setProductSearchTerms] = useState<{ [key: number]: string }>({});
  const [showProductDropdown, setShowProductDropdown] = useState<number | null>(null);
  const [selectedProductIndex, setSelectedProductIndex] = useState<number>(-1);
  const productSearchRefs = useRef<{ [key: number]: HTMLInputElement | null }>({});

  // Initialize form data when purchase order changes
  useEffect(() => {
    if (purchaseOrder) {
      setFormData({
        vendorName: purchaseOrder.vendorName,
        r3vPurchaseOrderNumber: purchaseOrder.r3vPurchaseOrderNumber,
        orderNumber: purchaseOrder.orderNumber || '',
        orderDate: purchaseOrder.orderDate.split('T')[0],
        deliveryDate: purchaseOrder.deliveryDate ? purchaseOrder.deliveryDate.split('T')[0] : '',
        status: purchaseOrder.status,
        totalAmount: purchaseOrder.totalAmount,
        notes: purchaseOrder.notes || '',
      });
      setItems(purchaseOrder.purchaseOrderItems || []);
      
      // Initialize product search terms
      const searchTerms: { [key: number]: string } = {};
      purchaseOrder.purchaseOrderItems.forEach((item, index) => {
        searchTerms[index] = `${item.product.brand} ${item.product.name}`;
      });
      setProductSearchTerms(searchTerms);
    }
  }, [purchaseOrder]);

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addItem = () => {
    const newItem: PurchaseOrderItem = {
      id: `temp-${Date.now()}`,
      productId: '',
      size: '',
      condition: 'NEW',
      quantityOrdered: 1,
      unitCost: 0,
      totalCost: 0,
      product: { id: '', brand: '', name: '' }
    };
    setItems(prev => [...prev, newItem]);
  };

  const removeItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: string, value: string | number | Product) => {
    setItems(prev => {
      const newItems = [...prev];
      newItems[index] = { ...newItems[index], [field]: value };
      
      // Recalculate total cost
      if (field === 'quantityOrdered' || field === 'unitCost') {
        const quantity = field === 'quantityOrdered' ? value : newItems[index].quantityOrdered;
        const unitCost = field === 'unitCost' ? value : newItems[index].unitCost;
        newItems[index].totalCost = Number(quantity) * Number(unitCost);
      }
      
      return newItems;
    });
  };

  const handleProductSearch = (index: number, searchTerm: string) => {
    setProductSearchTerms(prev => ({ ...prev, [index]: searchTerm }));
    setShowProductDropdown(index);
    setSelectedProductIndex(-1);
  };

  const selectProduct = (index: number, product: Product) => {
    updateItem(index, 'productId', product.id);
    updateItem(index, 'product', product);
    setProductSearchTerms(prev => ({ ...prev, [index]: `${product.brand} ${product.name}` }));
    setShowProductDropdown(null);
  };

  const filteredProducts = (searchTerm: string) => {
    if (!searchTerm) return [];
    return products.filter(product => 
      `${product.brand} ${product.name}`.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const calculateTotal = () => {
    try {
      if (!items || !Array.isArray(items)) {
        return 0;
      }
      const total = items.reduce((sum, item) => {
        const itemCost = typeof item.totalCost === 'number' ? item.totalCost : 0;
        return sum + itemCost;
      }, 0);
      return typeof total === 'number' ? total : 0;
    } catch (error) {
      console.error('Error calculating total:', error);
      return 0;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!purchaseOrder) {
      alert('Purchase order is required');
      return;
    }

    if (items.length === 0) {
      alert('At least one item is required');
      return;
    }

    if (items.some(item => !item.productId || !item.size || item.quantityOrdered <= 0)) {
      alert('Please fill in all required fields for all items');
      return;
    }

    setIsLoading(true);

    try {
      const token = await getAuthToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`/api/purchase-orders/${purchaseOrder.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          totalAmount: calculateTotal(),
          items: items.map(item => ({
            id: item.id.startsWith('temp-') ? undefined : item.id,
            productId: item.productId,
            size: item.size,
            condition: item.condition,
            quantityOrdered: item.quantityOrdered,
            unitCost: item.unitCost,
            totalCost: item.totalCost,
          })),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update purchase order');
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error updating purchase order:', error);
      alert(error instanceof Error ? error.message : 'Failed to update purchase order');
    } finally {
      setIsLoading(false);
    }
  };

  if (!purchaseOrder) return null;

  return (
    <Modal open={isOpen} onClose={onClose} width="4xl">
      <div className="p-6">
        <h2 className="text-2xl font-bold text-foreground mb-6">Edit Purchase Order</h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Vendor Name *
              </label>
              <Input
                value={formData.vendorName}
                onChange={(e) => handleInputChange('vendorName', e.target.value)}
                placeholder="Enter vendor name"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                R3V Purchase Order Number *
              </label>
              <Input
                value={formData.r3vPurchaseOrderNumber}
                onChange={(e) => handleInputChange('r3vPurchaseOrderNumber', e.target.value)}
                placeholder="Enter R3V P.O. number"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Order Number
              </label>
              <Input
                value={formData.orderNumber}
                onChange={(e) => handleInputChange('orderNumber', e.target.value)}
                placeholder="Enter order number"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Order Date *
              </label>
              <Input
                type="date"
                value={formData.orderDate}
                onChange={(e) => handleInputChange('orderDate', e.target.value)}
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Delivery Date
              </label>
              <Input
                type="date"
                value={formData.deliveryDate}
                onChange={(e) => handleInputChange('deliveryDate', e.target.value)}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Status *
              </label>
              <Select
                value={formData.status}
                onChange={(e) => handleInputChange('status', e.target.value)}
                required
              >
                <option value="DRAFT">Draft</option>
                <option value="SUBMITTED">Submitted</option>
                <option value="DELIVERED">Delivered</option>
                <option value="CANCELLED">Cancelled</option>
              </Select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="Enter any additional notes..."
              className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
              rows={3}
            />
          </div>

          {/* Items Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">Purchase Order Items</h3>
              <Button
                type="button"
                onClick={addItem}
                variant="outline"
                size="sm"
              >
                Add Item
              </Button>
            </div>

            {items.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No items added yet. Click "Add Item" to get started.
              </div>
            ) : (
              <div className="space-y-4">
                {items.map((item, index) => (
                  <div key={item.id} className="border border-border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-medium text-foreground">Item {index + 1}</h4>
                      <Button
                        type="button"
                        onClick={() => removeItem(index)}
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                      >
                        Remove
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {/* Product Selection */}
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Product *
                        </label>
                        <div className="relative">
                          <Input
                            ref={(el) => {
                              productSearchRefs.current[index] = el;
                            }}
                            value={productSearchTerms[index] || ''}
                            onChange={(e) => handleProductSearch(index, e.target.value)}
                            placeholder="Search for a product..."
                            onFocus={() => setShowProductDropdown(index)}
                          />
                          
                          {showProductDropdown === index && filteredProducts(productSearchTerms[index] || '').length > 0 && (
                            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
                              {filteredProducts(productSearchTerms[index] || '').map((product) => (
                                <button
                                  key={product.id}
                                  type="button"
                                  onClick={() => selectProduct(index, product)}
                                  className="block w-full text-left px-4 py-2 hover:bg-gray-100 focus:bg-gray-100"
                                >
                                  <div className="font-medium">{product.brand} {product.name}</div>
                                  {product.sku && (
                                    <div className="text-sm text-muted-foreground">SKU: {product.sku}</div>
                                  )}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Size */}
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Size *
                        </label>
                        <Input
                          value={item.size}
                          onChange={(e) => updateItem(index, 'size', e.target.value)}
                          placeholder="e.g., M, L, XL"
                          required
                        />
                      </div>

                      {/* Condition */}
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Condition *
                        </label>
                        <Select
                          value={item.condition}
                          onChange={(e) => updateItem(index, 'condition', e.target.value)}
                          required
                        >
                          <option value="NEW">New</option>
                          <option value="PRE_OWNED">Pre-owned</option>
                        </Select>
                      </div>

                      {/* Quantity */}
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Quantity *
                        </label>
                        <Input
                          type="number"
                          min="1"
                          value={item.quantityOrdered}
                          onChange={(e) => updateItem(index, 'quantityOrdered', parseInt(e.target.value))}
                          required
                        />
                      </div>

                      {/* Unit Cost */}
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Unit Cost *
                        </label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unitCost}
                          onChange={(e) => updateItem(index, 'unitCost', parseFloat(e.target.value))}
                          required
                        />
                      </div>

                      {/* Total Cost */}
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Total Cost
                        </label>
                        <Input
                          type="number"
                          value={item.totalCost}
                          readOnly
                          className="bg-gray-50"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Total Amount */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold text-foreground">Total Amount:</span>
                <span className="text-2xl font-bold text-foreground">
                  ${(() => {
                    try {
                      const total = calculateTotal();
                      return typeof total === 'number' ? total.toFixed(2) : '0.00';
                    } catch (error) {
                      console.error('Error formatting total:', error);
                      return '0.00';
                    }
                  })()}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-border">
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || items.length === 0}
            >
              {isLoading ? 'Updating...' : 'Update Purchase Order'}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
} 