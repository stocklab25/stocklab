import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface ReportFilters {
  type: string;
  store: string;
  startDate?: string;
  endDate?: string;
  status: string;
  itemType: string;
}

interface ReportsAPIResponse {
  success: boolean;
  data: {
    summary: {
      totalInventoryValue: number;
      totalItems: number;
      lowStockItems: number;
      activeStores: number;
    };
    reportData: any;
    filters: {
      applied: ReportFilters;
      available: {
        stores: any[];
        statuses: string[];
        itemTypes: string[];
      };
    };
    generatedAt: string;
    processingTime: number;
  };
  error?: string;
  details?: string;
}

export function useReportsAPI(filters: ReportFilters) {
  const [data, setData] = useState<ReportsAPIResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { getAuthToken } = useAuth();

  useEffect(() => {
    let isMounted = true;
    
    const fetchReportsData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const token = await getAuthToken();
        if (!token) {
          throw new Error('No auth token available');
        }
        
        if (!isMounted) return; // Prevent state updates if component unmounted

        // Build query parameters
        const params = new URLSearchParams();
        Object.entries(filters).forEach(([key, value]) => {
          if (value && value !== 'all') {
            params.append(key, value);
          }
        });

        const url = `/api/reports?${params.toString()}`;

        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });


        if (!response.ok) {
          let errorData;
          try {
            errorData = await response.json();
          } catch (jsonError) {
            errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
          }
          throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
        }

        const result: ReportsAPIResponse = await response.json();
        
        
        if (isMounted) {
          setData(result);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
        console.error('🔍 [useReportsAPI] Error fetching reports data:', errorMessage);
        console.error('🔍 [useReportsAPI] Error details:', err);
        if (isMounted) {
          setError(errorMessage);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchReportsData();
    
    return () => {
      isMounted = false;
    };
  }, [JSON.stringify(filters)]); // Use JSON.stringify to prevent unnecessary re-renders

  return { data, isLoading, error };
}
