import { useState } from 'react';

export function useAddSale(onSuccess?: () => void, onError?: (error: string) => void) {
  const [isLoading, setIsLoading] = useState(false);

  const addSale = async (data: any) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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