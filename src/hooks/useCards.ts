import useSWR from 'swr';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';

interface Card {
  id: string;
  name: string;
  type: string;
  lastFourDigits?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CardsResponse {
  data: Card[];
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

const useCards = () => {
  const { getAuthToken } = useAuth();
  const apiRoute = `/api/cards`;
  const { data, error, mutate } = useSWR<CardsResponse>(apiRoute, (url) => fetcher(url, getAuthToken), {
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
    data: data?.data || [],
    total: data?.total || 0,
    page: data?.page || 1,
    limit: data?.limit || 10,
    totalPages: data?.totalPages || 0,
    isLoading: !error && !data,
    isError: error,
    mutate,
  };
};

export default useCards;
export type { Card, CardsResponse }; 