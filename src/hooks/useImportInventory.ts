import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export interface ImportResult {
  created: number;
  skipped: number;
  errors: string[];
}

interface UseImportInventoryReturn {
  importInventory: (file: File) => Promise<ImportResult | null>;
  isLoading: boolean;
  error: string | null;
}

export const useImportInventory = (): UseImportInventoryReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { getAuthToken } = useAuth();

  const importInventory = async (file: File): Promise<ImportResult | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const token = await getAuthToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch('/api/inventory/import', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to import inventory');
      }

      return data.results;
    } catch (err: any) {
      const errorMessage = err.message || 'An error occurred while importing inventory';
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    importInventory,
    isLoading,
    error,
  };
};
