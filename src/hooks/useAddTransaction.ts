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

interface TransactionData {
  type: 'IN' | 'OUT' | 'MOVE' | 'RETURN' | 'ADJUSTMENT' | 'AUDIT';
  productId: string;
  quantity: number;
  date: string;
  fromLocation?: string;
  toLocation?: string;
  userId?: string;
  notes?: string;
}

const useAddTransaction = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { mutate: mutateTransactions } = useSWR('/api/transactions', fetcher);
  const { mutate: mutateProducts } = useSWR('/api/products', fetcher);

  const addTransaction = async (transactionData: TransactionData) => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify(transactionData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add transaction');
      }

      const result = await response.json();
      
      // Update both transactions and products cache
      await Promise.all([
        mutateTransactions(),
        mutateProducts()
      ]);
      
      return result;
    } catch (error) {
      console.error('Error adding transaction:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return { addTransaction, isLoading };
};

export default useAddTransaction; 