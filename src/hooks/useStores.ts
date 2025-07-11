import useSWR from 'swr';
import { useAuth } from '@/contexts/AuthContext';

export interface Store {
  id: string;
  name: string;
}

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
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to fetch stores');
  }
  return response.json();
};

export function useStores() {
  const { getAuthToken } = useAuth();
  const { data, error, isLoading, mutate } = useSWR<Store[], any, [string, () => Promise<string | null>]>(
    ['/api/stores?status=ACTIVE', getAuthToken],
    (args) => fetcher(args[0], args[1])
  );

  return {
    data: Array.isArray(data) ? data : [],
    isLoading,
    isError: error,
    mutate
  };
} 
