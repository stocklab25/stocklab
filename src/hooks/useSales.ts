import useSWR from 'swr';
import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface Sale {
  id: string;
  orderNumber: string;
  storeId: string;
  inventoryItemId: string;
  quantity: number;
  cost: number;
  payout: number;
  discount?: number;
  saleDate: string;
  notes?: string;
  store: {
    id: string;
    name: string;
  };
  inventoryItem: {
    id: string;
    sku: string;
    size: string;
    condition: string;
    product: {
      id: string;
      brand: string;
      name: string;
      color: string;
      sku: string;
    };
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
    throw new Error(errorData.error || 'Failed to fetch sales');
  }
  return response.json();
};

export function useSales() {
  const { getAuthToken } = useAuth();
  const { data, error, mutate } = useSWR<Sale[]>('/api/sales', (url) => fetcher(url, getAuthToken), {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateOnMount: false,
    revalidateIfStale: false,
    dedupingInterval: 0,
    refreshInterval: 0,
    errorRetryCount: 0,
    shouldRetryOnError: false,
  });

  // Manually trigger initial fetch if no data
  useEffect(() => {
    if (!data && !error) {
      mutate();
    }
  }, [data, error, mutate]);

  return {
    data: Array.isArray(data) ? data : [],
    isLoading: !error && !data,
    isError: error,
    mutate,
  };
} 