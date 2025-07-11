import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface ImportResult {
  salesCreated: number;
  errors: string[];
}

interface UseImportSalesReturn {
  importSales: (file: File) => Promise<ImportResult | null>;
  isLoading: boolean;
  error: string | null;
}

export const useImportSales = (): UseImportSalesReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { getAuthToken } = useAuth();

  const importSales = async (file: File): Promise<ImportResult | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/sales/import', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to import sales');
      }

      return data.results;
    } catch (err: any) {
      const errorMessage = err.message || 'An error occurred while importing sales';
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    importSales,
    isLoading,
    error,
  };
}; 
