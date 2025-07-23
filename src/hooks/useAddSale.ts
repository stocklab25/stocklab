import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface SaleItem {
  storeId: string;
  inventoryItemId: string;
  cost: number;
  payout: number;
  discount: number;
  quantity: number;
  notes: string;
  selectedStore: any;
  selectedItem: any;
  skuDisplay: string;
}

export function useAddSale(onSuccess?: () => void, onError?: (error: string) => void) {
  const [isLoading, setIsLoading] = useState(false);
  const { getAuthToken } = useAuth();

  const addSale = async (saleItems: SaleItem[]) => {
    setIsLoading(true);
    try {
      const token = await getAuthToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Create multiple sales in sequence
      const results = [];
      for (const item of saleItems) {
        const saleData = {
          storeId: item.storeId,
          inventoryItemId: item.inventoryItemId,
          cost: item.cost,
          payout: item.payout,
          discount: item.discount,
          quantity: item.quantity,
          notes: item.notes,
        };

      const response = await fetch('/api/sales', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
          body: JSON.stringify(saleData),
      });
        
      const result = await response.json();
      if (!response.ok) {
          throw new Error(`Failed to add sale for ${item.skuDisplay}: ${result.error || 'Unknown error'}`);
        }
        results.push(result);
      }

      if (onSuccess) onSuccess();
    } catch (error: any) {
      if (onError) onError(error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return { addSale, isLoading };
} 
