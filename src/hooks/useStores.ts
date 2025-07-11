import useSWR from 'swr';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';

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
  const key = '/api/stores?status=ACTIVE';
  const { data, error, isLoading, mutate } = useSWR<Store[], any>(
    key,
    (url: string) => fetcher(url, getAuthToken),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      revalidateOnMount: false, // Changed to false
      revalidateIfStale: false,
      dedupingInterval: 0, // Disable deduplication
      refreshInterval: 0, // Disable automatic refresh
      errorRetryCount: 0, // Disable error retries
      shouldRetryOnError: false, // Disable retry on error
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
