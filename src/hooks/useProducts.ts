import useSWR from 'swr';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';

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

const useProducts = () => {
  const { getAuthToken } = useAuth();
  const apiRoute = `/api/products`;
  const { data, error, mutate } = useSWR(apiRoute, (url) => fetcher(url, getAuthToken), {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateOnMount: false, // Changed to false
    revalidateIfStale: false,
    dedupingInterval: 0, // Disable deduplication
    refreshInterval: 0, // Disable automatic refresh
    errorRetryCount: 0, // Disable error retries
    shouldRetryOnError: false, // Disable retry on error
  });

  // Manually trigger initial fetch if no data
  useEffect(() => {
    if (!data && !error) {
      mutate();
    }
  }, [data, error, mutate]);

  return {
    data: data?.data || [],
    isLoading: !error && !data,
    isError: error,
    mutate,
  };
};

export default useProducts; 
