import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export interface ImportResult {
  created: number;
  skipped: number;
  errors: string[];
}

interface UseImportProductsReturn {
  importProducts: (file: File) => Promise<ImportResult | null>;
  isLoading: boolean;
  error: string | null;
}

export const useImportProducts = (): UseImportProductsReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { getAuthToken } = useAuth();

  const importProducts = async (file: File): Promise<ImportResult | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const token = await getAuthToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch('/api/products/import', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to import products');
      }

      return data.results;
    } catch (err: any) {
      const errorMessage = err.message || 'An error occurred while importing products';
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    importProducts,
    isLoading,
    error,
  };
};
