import useSWR from 'swr';
import { useAuth } from '@/contexts/AuthContext';

export interface Store {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  storeSkuBase?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export function useStores(status?: string) {
  const { getAuthToken } = useAuth();
  const url = status ? `/api/stores?status=${status}` : '/api/stores';
  
  const createFetcher = async (url: string) => {
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
      throw new Error('Failed to fetch data');
    }

    return response.json();
  };
  
  const { data, error, isLoading, mutate } = useSWR<Store[]>(
    url,
    createFetcher
  );

  return {
    data: Array.isArray(data) ? data : [],
    isLoading,
    isError: error,
    mutate
  };
}