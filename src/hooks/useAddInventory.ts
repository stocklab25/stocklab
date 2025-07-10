import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface AddInventoryData {
  productId: string;
  sku: string;
  size: string;
  condition: 'NEW' | 'PRE_OWNED';
  cost: number;
  status: string;
  location?: string;
  quantity?: number;
  vendor: string;
  paymentMethod: string;
}

interface AddInventoryResponse {
  success: boolean;
  data: any;
  transaction: any;
  message: string;
}

export function useAddInventory() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { getAuthToken } = useAuth();

  const addInventory = async (data: AddInventoryData): Promise<AddInventoryResponse | null> => {
    setLoading(true);
    setError(null);

    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch('/api/inventory', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to add inventory item');
      }

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    addInventory,
    loading,
    error,
  };
} 