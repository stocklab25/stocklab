import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface ImportResult {
  expensesCreated: number;
  errors: string[];
}

interface UseImportExpensesReturn {
  importExpenses: (file: File) => Promise<ImportResult | null>;
  isLoading: boolean;
  error: string | null;
}

export const useImportExpenses = (): UseImportExpensesReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { getAuthToken } = useAuth();

  const importExpenses = async (file: File): Promise<ImportResult | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/expenses/import', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to import expenses');
      }

      return data.results;
    } catch (err: any) {
      const errorMessage = err.message || 'An error occurred while importing expenses';
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    importExpenses,
    isLoading,
    error,
  };
}; 