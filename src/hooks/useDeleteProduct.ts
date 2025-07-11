import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface DeleteProductOptions {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export function useDeleteProduct(options: DeleteProductOptions = {}) {
  const [loading, setLoading] = useState(false);
  const { getAuthToken } = useAuth();

  const deleteProduct = async (productId: string, isHardDelete: boolean = false, forceDelete: boolean = false) => {
    setLoading(true);
    
    try {
      const token = await getAuthToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      let url = `/api/products/${productId}`;
      if (isHardDelete) {
        url += '?hard=true';
        if (forceDelete) {
          url += '&force=true';
        }
      }

      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete product');
      }

      options.onSuccess?.();
      return data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete product';
      options.onError?.(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const archiveProduct = (productId: string) => deleteProduct(productId, false);
  const hardDeleteProduct = (productId: string, force: boolean = false) => deleteProduct(productId, true, force);

  return {
    deleteProduct,
    archiveProduct,
    hardDeleteProduct,
    loading
  };
} 
