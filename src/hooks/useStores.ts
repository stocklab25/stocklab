import useSWR from 'swr';

export interface Store {
  id: string;
  name: string;
}

const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to fetch stores');
  }
  return response.json();
};

export function useStores() {
  const { data, error, isLoading, mutate } = useSWR<Store[]>(
    '/api/stores?status=ACTIVE',
    fetcher
  );

  return {
    data: Array.isArray(data) ? data : [],
    isLoading,
    isError: error,
    mutate
  };
} 