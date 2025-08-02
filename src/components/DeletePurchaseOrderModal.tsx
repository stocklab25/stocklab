'use client';

import React from 'react';
import Modal from './Modal';
import Button from './Button';

interface PurchaseOrder {
  id: string;
  vendorName: string;
  r3vPurchaseOrderNumber: string;
  status: string;
}

interface DeletePurchaseOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  purchaseOrder: PurchaseOrder | null;
  isLoading?: boolean;
}

export default function DeletePurchaseOrderModal({
  isOpen,
  onClose,
  onConfirm,
  purchaseOrder,
  isLoading = false,
}: DeletePurchaseOrderModalProps) {
  if (!purchaseOrder) return null;

  return (
    <Modal open={isOpen} onClose={onClose} width="3xl">
      <div className="p-6">
        <h2 className="text-2xl font-bold text-foreground mb-4">Delete Purchase Order</h2>
        
        <div className="space-y-4">
          <p className="text-foreground">
            Are you sure you want to delete this purchase order?
          </p>
          
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium text-foreground mb-2">Purchase Order Details:</h3>
            <div className="space-y-1 text-sm">
              <p><span className="font-medium">Vendor:</span> {purchaseOrder.vendorName}</p>
              <p><span className="font-medium">R3V P.O. #:</span> {purchaseOrder.r3vPurchaseOrderNumber}</p>
              <p><span className="font-medium">Status:</span> {purchaseOrder.status}</p>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">Important Note</h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>
                    This purchase order will be soft deleted. If it has been delivered and items have been added to inventory, 
                    those inventory items will remain in the system. Only the purchase order record will be marked as deleted.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            This action cannot be undone. The purchase order will be permanently deleted.
          </p>
        </div>

        <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-border">
          <Button
            type="button"
            onClick={onClose}
            variant="outline"
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            variant="destructive"
            disabled={isLoading}
          >
            {isLoading ? 'Deleting...' : 'Delete Purchase Order'}
          </Button>
        </div>
      </div>
    </Modal>
  );
} 