import useSWR from 'swr';
import { useAuth } from '@/contexts/AuthContext';

export interface StoreInventoryItem {
  id: string;
  storeId: string;
  inventoryItemId: string;
  quantity: number;
  storeSku?: string;
  transferCost: number;
  createdAt: string;
  updatedAt: string;
  inventoryItem: {
    id: string;
    sku: string;
    stocklabSku?: string;
    size: string;
    condition: string;
    cost: number;
    product: {
      id: string;
      brand: string;
      name: string;
      sku?: string;
    };
    quantity: number;
  };
  store?: {
    id: string;
    name: string;
  };
}

const createFetcher = (getAuthToken: () => Promise<string | null>) => async (url: string) => {
  const token = await getAuthToken();
  if (!token) {
    throw new Error('No authentication token available');
  }
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to fetch store inventory');
  }
  return response.json();
};

export function useStoreInventory(storeId: string | null) {
  const { getAuthToken } = useAuth();
  const shouldFetch = !!storeId;
  const { data, error, isLoading, mutate } = useSWR<StoreInventoryItem[]>(
    shouldFetch ? `/api/stores/${storeId}/inventory` : null,
    createFetcher(getAuthToken)
  );

  return {
    data: Array.isArray(data) ? data : [],
    isLoading,
    isError: error,
    mutate
  };
}

// Hook to fetch all store inventory data
export function useAllStoreInventory() {
  const { getAuthToken } = useAuth();
  const { data, error, isLoading, mutate } = useSWR<StoreInventoryItem[]>(
    '/api/stores/inventory',
    createFetcher(getAuthToken)
  );

  return {
    data: Array.isArray(data) ? data : [],
    isLoading,
    isError: error,
    mutate
  };
} 
