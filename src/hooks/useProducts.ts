import useSWR from 'swr';
import { useAuth } from '@/contexts/AuthContext';

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
  const { data, error, mutate } = useSWR([apiRoute, getAuthToken], ([url, tokenFn]) => fetcher(url, tokenFn));

  return {
    data: data?.data || [],
    isLoading: !error && !data,
    isError: error,
    mutate,
  };
};

export default useProducts; 
