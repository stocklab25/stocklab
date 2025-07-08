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
  inventoryItemId: string;
  quantity: number;
  date: string;
  storeId?: string;
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
      
      // If it's an OUT transaction with a store, handle as store transfer
      if (transactionData.type === 'OUT' && transactionData.storeId) {
        // Transfer to store using the inventoryItemId directly
        const transferResponse = await fetch('/api/transfers/warehouse-to-store', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : '',
          },
          body: JSON.stringify({
            inventoryItemId: transactionData.inventoryItemId,
            storeId: transactionData.storeId,
            quantity: transactionData.quantity,
            notes: transactionData.notes || `Stock Out to store - ${transactionData.notes || ''}`
          }),
        });
        
        if (!transferResponse.ok) {
          const errorData = await transferResponse.json();
          throw new Error(errorData.error || 'Failed to transfer to store');
        }
        
        const result = await transferResponse.json();
        
        // Update both transactions and products cache
        await Promise.all([
          mutateTransactions(),
          mutateProducts()
        ]);
        
        return result;
      } else {
        // Regular transaction (not store transfer)
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
      }
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