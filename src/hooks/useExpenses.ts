import useSWR from 'swr';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';

interface Expense {
  id: string;
  transactionDate: string;
  description: string;
  amount: number;
  category: string;
  cardId?: string;
  card?: {
    id: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface ExpensesResponse {
  data: Expense[];
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

const useExpenses = () => {
  const { getAuthToken } = useAuth();
  const apiRoute = `/api/expenses`;
  const { data, error, mutate } = useSWR<ExpensesResponse>(apiRoute, (url) => fetcher(url, getAuthToken), {
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

export default useExpenses;
export type { Expense, ExpensesResponse }; 