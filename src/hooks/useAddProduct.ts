import { useState } from 'react';
import useSWR from 'swr';

// Fetcher function with authentication
const fetcher = async (url: string) => {
  const token = localStorage.getItem('authToken');
  
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
};

const useAddProduct = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { mutate } = useSWR('/api/products', fetcher);

  const addProduct = async (productData: { brand: string; name: string; color?: string; sku?: string; itemType: 'SHOE' | 'APPAREL' | 'MERCH' }) => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      
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
      
      // Update the cache
      await mutate();
      
      return result;
    } catch (error) {
      console.error('Error adding product:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return { addProduct, isLoading };
};

export default useAddProduct; 