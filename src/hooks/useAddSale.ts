import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export function useAddSale(onSuccess?: () => void, onError?: (error: string) => void) {
  const [isLoading, setIsLoading] = useState(false);
  const { getAuthToken } = useAuth();

  const addSale = async (data: any) => {
    setIsLoading(true);
    try {
      const token = await getAuthToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch('/api/sales', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to add sale');
      }
      if (onSuccess) onSuccess();
      return result;
    } catch (error: any) {
      if (onError) onError(error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return { addSale, isLoading };
} 
