import useSWR from 'swr';
import { useAuth } from '@/contexts/AuthContext';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'USER';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface UsersResponse {
  data: User[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const fetcher = async (url: string, token: string): Promise<UsersResponse> => {
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch users');
  }
  
  return response.json();
};

export function useUsers(page: number = 1, limit: number = 10) {
  const { getAuthToken } = useAuth();
  
  // Check if we're in the browser environment
  const isBrowser = typeof window !== 'undefined';
  const token = isBrowser ? getAuthToken() : null;

  const { data, error, isLoading, mutate } = useSWR<UsersResponse>(
    token ? [`/api/users?page=${page}&limit=${limit}`, token] : null,
    ([url, token]: [string, string]) => fetcher(url, token),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  );

  return {
    users: data?.data || [],
    total: data?.total || 0,
    page: data?.page || 1,
    limit: data?.limit || 10,
    totalPages: data?.totalPages || 0,
    isLoading,
    isError: error,
    mutate,
  };
} 