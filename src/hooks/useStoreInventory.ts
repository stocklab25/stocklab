import useSWR from 'swr';

export interface StoreInventoryItem {
  id: string;
  inventoryItemId: string;
  quantity: number;
  inventoryItem: {
    id: string;
    sku: string;
    stocklabSku?: string;
    size: string;
    condition: string;
    product: {
      id: string;
      brand: string;
      name: string;
      sku?: string;
    };
    quantity: number;
  };
}

const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to fetch store inventory');
  }
  return response.json();
};

export function useStoreInventory(storeId: string | null) {
  const shouldFetch = !!storeId;
  const { data, error, isLoading, mutate } = useSWR<StoreInventoryItem[]>(
    shouldFetch ? `/api/stores/${storeId}/inventory` : null,
    fetcher
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
  const { data, error, isLoading, mutate } = useSWR<StoreInventoryItem[]>(
    '/api/stores/inventory',
    fetcher
  );

  return {
    data: Array.isArray(data) ? data : [],
    isLoading,
    isError: error,
    mutate
  };
} 
