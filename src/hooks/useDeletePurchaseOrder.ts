'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface DeletePurchaseOrderOptions {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export function useDeletePurchaseOrder(options: DeletePurchaseOrderOptions = {}) {
  const [loading, setLoading] = useState(false);
  const { getAuthToken } = useAuth();

  const deletePurchaseOrder = async (purchaseOrderId: string) => {
    setLoading(true);
    
    try {
      const token = await getAuthToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(`/api/purchase-orders/${purchaseOrderId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete purchase order');
      }

      options.onSuccess?.();
      return data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete purchase order';
      options.onError?.(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    deletePurchaseOrder,
    loading
  };
} 