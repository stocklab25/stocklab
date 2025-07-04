import useSWR from 'swr';

// Fetcher function with authentication
const fetcher = async (url: string) => {
  const token = localStorage.getItem('authToken');
  
  const response = await fetch(url, {
    headers: {
      'Authorization': token ? `Bearer ${token}` : '',
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return response.json();
};

const useInventory = () => {
  const apiRoute = `/api/inventory`;
  const { data, error, mutate } = useSWR(apiRoute, fetcher);

  return {
    data: data?.data || [],
    isLoading: !error && !data,
    isError: error,
    mutate,
  };
};

export default useInventory; 