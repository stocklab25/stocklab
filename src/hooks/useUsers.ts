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

const fetcher = async (url: string, getAuthToken: () => Promise<string | null>): Promise<UsersResponse> => {
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
    throw new Error('Failed to fetch users');
  }
  
  return response.json();
};

export function useUsers(page: number = 1, limit: number = 10) {
  const { getAuthToken } = useAuth();

  const { data, error, isLoading, mutate } = useSWR<UsersResponse>(
    [`/api/users?page=${page}&limit=${limit}`, getAuthToken],
    ([url, tokenFn]: [string, () => Promise<string | null>]) => fetcher(url, tokenFn),
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
