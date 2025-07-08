import useSWR from 'swr';

interface InventoryItem {
  id: string;
  sku: string;
  size: string;
  condition: string;
  cost: number;
  payout: number;
  consigner: string;
  consignDate: string;
  status: string;
  quantity: number;
  product: {
    id: string;
    brand: string;
    name: string;
    sku?: string;
  };
}

const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to fetch inventory items');
  }
  return response.json();
};

export function useInventoryItems() {
  const { data, error, isLoading, mutate } = useSWR<InventoryItem[]>(
    '/api/inventory-items',
    fetcher
  );

  return {
    data: Array.isArray(data) ? data : [],
    isLoading,
    isError: error,
    mutate
  };
} 