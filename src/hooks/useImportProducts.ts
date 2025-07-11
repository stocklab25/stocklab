import { useState } from 'react';

interface ImportResult {
  productsCreated: number;
  productsUpdated: number;
  inventoryItemsCreated: number;
  errors: string[];
}

interface UseImportProductsReturn {
  importProducts: (file: File) => Promise<ImportResult>;
  isLoading: boolean;
  error: string | null;
}

export function useImportProducts(): UseImportProductsReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const importProducts = async (file: File): Promise<ImportResult> => {
    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('authToken');
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/products/import', {
        method: 'POST',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to import products');
      }

      const data = await response.json();
      return data.results;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    importProducts,
    isLoading,
    error,
  };
} 
