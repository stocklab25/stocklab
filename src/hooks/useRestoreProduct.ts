import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface RestoreProductOptions {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export function useRestoreProduct(options: RestoreProductOptions = {}) {
  const [loading, setLoading] = useState(false);
  const { getAuthToken } = useAuth();

  const restoreProduct = async (productId: string) => {
    setLoading(true);
    
    try {
      const token = await getAuthToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(`/api/products/${productId}?action=restore`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to restore product');
      }

      options.onSuccess?.();
      return data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to restore product';
      options.onError?.(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    restoreProduct,
    loading
  };
} 
