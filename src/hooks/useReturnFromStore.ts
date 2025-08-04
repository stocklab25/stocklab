import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface UseReturnFromStoreProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export const useReturnFromStore = ({ onSuccess, onError }: UseReturnFromStoreProps = {}) => {
  const [isReturning, setIsReturning] = useState(false);
  const { getAuthToken } = useAuth();

  const returnFromStore = async (storeId: string, storeInventoryIds: string[]) => {
    setIsReturning(true);
    try {
      const token = await getAuthToken();
      if (!token) {
        throw new Error('No authentication token available');
      }

      const response = await fetch(`/api/stores/${storeId}/inventory/return`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          storeInventoryIds,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to return items');
      }

      const result = await response.json();
      onSuccess?.();
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to return items';
      onError?.(errorMessage);
      throw error;
    } finally {
      setIsReturning(false);
    }
  };

  return {
    returnFromStore,
    isReturning,
  };
}; 