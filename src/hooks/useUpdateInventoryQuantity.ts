import { mutate } from 'swr';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface UpdateQuantityData {
  quantity: number;
}

export const useUpdateInventoryQuantity = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { getAuthToken } = useAuth();

  const updateQuantity = async (inventoryId: string, data: UpdateQuantityData) => {
    setIsLoading(true);
    setError(null);

    try {
      const token = await getAuthToken();
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      const response = await fetch(`/api/inventory/${inventoryId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update quantity');
      }

      // Optimistically update the inventory list
      await mutate('/api/inventory');
      
      return await response.json();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update quantity';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    updateQuantity,
    isLoading,
    error,
  };
}; 
