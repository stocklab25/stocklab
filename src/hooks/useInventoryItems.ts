import useSWR from 'swr';
import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface InventoryItem {
  id: string;
  productId: string;
  sku: string;
  stocklabSku?: string;
  size: string;
  condition: string;
  cost: number;
  status: string;
  quantity: number;
  product: {
    id: string;
    brand: string;
    name: string;
    color: string;
    sku: string;
  };
}

const fetcher = async (url: string, getAuthToken: () => Promise<string | null>) => {
  const token = await getAuthToken();
  if (!token) {
    throw new Error('No authentication token found');
  }

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to fetch inventory items');
  }
  return response.json();
};

export function useInventoryItems() {
  const { getAuthToken } = useAuth();
  const { data, error, isLoading, mutate } = useSWR<InventoryItem[]>(
    '/api/inventory-items',
    (url) => fetcher(url, getAuthToken),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      revalidateOnMount: false,
      revalidateIfStale: false,
      dedupingInterval: 0,
      refreshInterval: 0,
      errorRetryCount: 0,
      shouldRetryOnError: false,
    }
  );

  // Manually trigger initial fetch if no data
  useEffect(() => {
    if (!data && !error) {
      mutate();
    }
  }, [data, error, mutate]);

  return {
    data: Array.isArray(data) ? data : [],
    isLoading,
    isError: error,
    mutate
  };
} 
