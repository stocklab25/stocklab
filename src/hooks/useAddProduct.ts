import { useState } from 'react';
import useSWR from 'swr';
import { useAuth } from '@/contexts/AuthContext';

const useAddProduct = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { getAuthToken } = useAuth();
  const { mutate } = useSWR('/api/products', (url: string) => {
    return (async () => {
      const token = await getAuthToken();
      const response = await fetch(url, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })();
  });

  const addProduct = async (productData: { brand: string; name: string; color?: string; sku?: string; itemType: string }) => {
    setIsLoading(true);
    try {
      const token = await getAuthToken();
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify(productData),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add product');
      }
      const result = await response.json();
      await mutate();
      return result;
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return { addProduct, isLoading };
};

export default useAddProduct; 
