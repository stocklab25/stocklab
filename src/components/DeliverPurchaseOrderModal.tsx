'use client';

import React, { useState } from 'react';
import Modal from './Modal';
import Button from './Button';
import Input from './Input';
import { useAuth } from '@/contexts/AuthContext';

interface PurchaseOrder {
  id: string;
  vendorName: string;
  orderNumber?: string;
  purchaseOrderItems: Array<{
    id: string;
    product: {
      brand: string;
      name: string;
    };
    size: string;
    condition: string;
    quantityOrdered: number;
    unitCost: number;
  }>;
}

interface DeliverPurchaseOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  purchaseOrder: PurchaseOrder | null;
}

export default function DeliverPurchaseOrderModal({
  isOpen,
  onClose,
  onSuccess,
  purchaseOrder,
}: DeliverPurchaseOrderModalProps) {
  const { getAuthToken } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!purchaseOrder) {
      alert('Purchase order is required');
      return;
    }

    setIsLoading(true);

    try {
      const token = await getAuthToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`/api/purchase-orders/${purchaseOrder.id}/deliver`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to mark purchase order as delivered');
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error delivering purchase order:', error);
      alert(error instanceof Error ? error.message : 'Failed to deliver purchase order');
    } finally {
      setIsLoading(false);
    }
  };

  if (!purchaseOrder) return null;

  const totalQuantity = purchaseOrder.purchaseOrderItems.reduce((sum, item) => sum + item.quantityOrdered, 0);
  const totalCost = purchaseOrder.purchaseOrderItems.reduce((sum, item) => sum + (item.unitCost * item.quantityOrdered), 0);
  const uniqueInventoryItems = purchaseOrder.purchaseOrderItems.length;

  return (
    <Modal open={isOpen} onClose={onClose} width="2xl">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-foreground">Mark Purchase Order as Delivered</h2>
        <p className="text-muted-foreground mt-1">
          This will create inventory items in the warehouse and mark the purchase order as delivered.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Purchase Order Summary */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-medium text-foreground mb-3">Purchase Order Summary</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Vendor:</span>
              <span className="ml-2 font-medium">{purchaseOrder.vendorName}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Order #:</span>
              <span className="ml-2 font-medium">{purchaseOrder.orderNumber || 'N/A'}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Total Quantity:</span>
              <span className="ml-2 font-medium">{totalQuantity}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Unique Items:</span>
              <span className="ml-2 font-medium">{uniqueInventoryItems}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Total Cost:</span>
              <span className="ml-2 font-medium">${totalCost.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Items List */}
        <div>
          <h3 className="font-medium text-foreground mb-3">Items to be added to inventory:</h3>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {purchaseOrder.purchaseOrderItems.map((item, index) => (
              <div key={item.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                <div>
                  <span className="font-medium">{item.product.brand} - {item.product.name}</span>
                  <span className="text-sm text-muted-foreground ml-2">Size: {item.size}</span>
                  <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                    item.condition === 'NEW' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {item.condition === 'NEW' ? 'New' : 'Pre-owned'}
                  </span>
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">Qty: {item.quantityOrdered}</span>
                  <span className="ml-2 text-muted-foreground">@ ${item.unitCost}</span>
                </div>
              </div>
            ))}
          </div>
        </div>



        {/* Warning */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                Important
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>
                  This action will:
                </p>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>Mark the purchase order as "Delivered"</li>
                  <li>Create {uniqueInventoryItems} inventory items with StockLab SKUs</li>
                  <li>Add items to warehouse inventory</li>
                  <li>Record stock transactions for each item</li>
                  <li>Preserve the condition specified in the purchase order</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3">
          <Button type="button" onClick={onClose} variant="outline">
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Processing...' : 'Mark as Delivered'}
          </Button>
        </div>
      </form>
    </Modal>
  );
} 