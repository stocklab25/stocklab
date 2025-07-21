import useSWR from 'swr';
import { useAuth } from '@/contexts/AuthContext';

interface PurchaseOrder {
  id: string;
  vendorName: string;
  orderNumber?: string;
  orderDate: string;
  deliveryDate?: string;
  status: 'DRAFT' | 'SUBMITTED' | 'DELIVERED' | 'CANCELLED';
  totalAmount: number;
  notes?: string;
  createdAt: string;
  purchaseOrderItems: PurchaseOrderItem[];
}

interface PurchaseOrderItem {
  id: string;
  productId: string;
  size: string;
  quantityOrdered: number;
  unitCost: number;
  totalCost: number;
  product: {
    id: string;
    brand: string;
    name: string;
    sku?: string;
  };
}

const fetcher = async (url: string, token: string) => {
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch purchase orders');
  }

  return response.json();
};

export function usePurchaseOrders(status?: string, vendor?: string) {
  const { getAuthToken } = useAuth();

  const params = new URLSearchParams();
  if (status) params.append('status', status);
  if (vendor) params.append('vendor', vendor);

  const url = `/api/purchase-orders${params.toString() ? `?${params.toString()}` : ''}`;

  const { data, error, isLoading, mutate } = useSWR(
    ['purchase-orders', url],
    async () => {
      const token = await getAuthToken();
      if (!token) throw new Error('No authentication token');
      return fetcher(url, token);
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    }
  );

  return {
    data: data || [],
    isLoading,
    isError: error,
    mutate,
  };
}

export function usePurchaseOrder(id: string) {
  const { getAuthToken } = useAuth();

  const { data, error, isLoading, mutate } = useSWR(
    id ? ['purchase-order', id] : null,
    async () => {
      const token = await getAuthToken();
      if (!token) throw new Error('No authentication token');
      return fetcher(`/api/purchase-orders/${id}`, token);
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    }
  );

  return {
    data,
    isLoading,
    isError: error,
    mutate,
  };
} 