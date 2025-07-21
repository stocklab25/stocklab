import { useState } from 'react';
import useSWR from 'swr';
import { useAuth } from '@/contexts/AuthContext';

// Fetcher function with authentication
const fetcher = async (url: string, getAuthToken: () => Promise<string | null>) => {
  const token = await getAuthToken();
  if (!token) {
    throw new Error('No authentication token found');
  }
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
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
  markup?: number;
}

const useAddTransaction = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { getAuthToken } = useAuth();
  const { mutate: mutateTransactions } = useSWR('/api/transactions', (url) => fetcher(url, getAuthToken));
  const { mutate: mutateProducts } = useSWR('/api/products', (url) => fetcher(url, getAuthToken));

  const addTransaction = async (transactionData: TransactionData) => {
    setIsLoading(true);
    try {
      const token = await getAuthToken();
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      // If it's an OUT transaction with a store, handle as store transfer
      if (transactionData.type === 'OUT' && transactionData.storeId) {
        // Get the inventory item to use its cost as transfer cost
        const inventoryResponse = await fetch(`/api/inventory/${transactionData.inventoryItemId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        
        let transferCost = 0;
        if (inventoryResponse.ok) {
          const inventoryData = await inventoryResponse.json();
          transferCost = parseFloat(inventoryData.cost) + (transactionData.markup || 0); // Add markup if provided
        }
        
        // Transfer to store using the inventoryItemId directly
        const transferResponse = await fetch('/api/transfers/warehouse-to-store', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            inventoryItemId: transactionData.inventoryItemId,
            storeId: transactionData.storeId,
            quantity: transactionData.quantity,
            transferCost: transferCost,
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
          'Authorization': `Bearer ${token}`,
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
      
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return { addTransaction, isLoading };
};

export default useAddTransaction; 
