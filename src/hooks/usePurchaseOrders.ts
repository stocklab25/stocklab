import useSWR from 'swr';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';

interface PurchaseOrder {
  id: string;
  r3vPurchaseOrderNumber: string;
  inventoryItemId: string;
  vendor: string;
  paymentMethod: string;
  orderNumber?: string;
  quantity: number;
  cost: number;
  purchaseDate: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
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
    };
  };
}

interface PurchaseOrdersResponse {
  data: PurchaseOrder[];
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
}

// Fetcher function with authentication
const fetcher = async (url: string, getAuthToken: () => Promise<string | null>) => {
  const token = await getAuthToken();
  
  if (!token) {
    throw new Error('No authentication token available');
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

const usePurchaseOrders = () => {
  const { getAuthToken } = useAuth();
  const apiRoute = `/api/purchase-orders`;
  const { data, error, mutate } = useSWR<PurchaseOrder[]>(apiRoute, (url) => fetcher(url, getAuthToken), {
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
    data: data || [],
    total: data?.length || 0,
    page: 1,
    limit: data?.length || 10,
    totalPages: 1,
    isLoading: !error && !data,
    isError: error,
    mutate,
  };
};

export default usePurchaseOrders;
export type { PurchaseOrder, PurchaseOrdersResponse }; 