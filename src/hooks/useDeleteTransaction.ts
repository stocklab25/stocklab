import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface DeleteTransactionOptions {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export function useDeleteTransaction(options: DeleteTransactionOptions = {}) {
  const [loading, setLoading] = useState(false);
  const { getAuthToken } = useAuth();

  const deleteTransaction = async (transactionId: string, isHardDelete: boolean = false) => {
    setLoading(true);
    
    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      const url = isHardDelete 
        ? `/api/transactions?id=${transactionId}&hard=true`
        : `/api/transactions?id=${transactionId}`;

      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete transaction');
      }

      options.onSuccess?.();
      return data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete transaction';
      options.onError?.(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const archiveTransaction = (transactionId: string) => deleteTransaction(transactionId, false);
  const hardDeleteTransaction = (transactionId: string) => deleteTransaction(transactionId, true);

  return {
    deleteTransaction,
    archiveTransaction,
    hardDeleteTransaction,
    loading
  };
} 