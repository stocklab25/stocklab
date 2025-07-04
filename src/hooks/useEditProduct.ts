import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface EditProductData {
  brand: string;
  name: string;
  color?: string;
  sku?: string;
}

interface EditProductOptions {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export function useEditProduct(options: EditProductOptions = {}) {
  const [loading, setLoading] = useState(false);
  const { getAuthToken } = useAuth();

  const editProduct = async (productId: string, productData: EditProductData) => {
    setLoading(true);
    
    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(`/api/products/${productId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(productData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to edit product');
      }

      options.onSuccess?.();
      return data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to edit product';
      options.onError?.(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    editProduct,
    loading
  };
} 