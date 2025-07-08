import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface WipeDataResponse {
  success: boolean;
  message: string;
  deleted: {
    transactions: number;
    inventoryItems: number;
    products: number;
    total: number;
  };
}

export function useWipeData() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { getAuthToken } = useAuth();

  const wipeData = async (): Promise<WipeDataResponse | null> => {
    setLoading(true);
    setError(null);

    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch('/api/admin/wipe-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ confirm: true }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to wipe data');
      }

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    wipeData,
    loading,
    error,
  };
} 