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
      console.log('🔍 [useReportsAPI] Starting API call with filters:', filters);
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
        console.log('🔍 [useReportsAPI] API URL:', url);
        console.log('🔍 [useReportsAPI] Auth token length:', token.length);
        console.log('🔍 [useReportsAPI] Auth token preview:', token.substring(0, 20) + '...');

        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        console.log('🔍 [useReportsAPI] Response status:', response.status);
        console.log('🔍 [useReportsAPI] Response headers:', Object.fromEntries(response.headers.entries()));

        if (!response.ok) {
          let errorData;
          try {
            errorData = await response.json();
          } catch (jsonError) {
            console.error('🔍 [useReportsAPI] Failed to parse error response as JSON:', jsonError);
            errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
          }
          console.error('🔍 [useReportsAPI] API Error Response:', errorData);
          console.error('🔍 [useReportsAPI] Response status:', response.status);
          console.error('🔍 [useReportsAPI] Response statusText:', response.statusText);
          throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
        }

        const result: ReportsAPIResponse = await response.json();
        console.log('🔍 [useReportsAPI] ===== API RESPONSE RECEIVED =====');
        console.log('🔍 [useReportsAPI] Success:', result.success);
        console.log('🔍 [useReportsAPI] Processing time:', result.data?.processingTime, 'ms');
        console.log('🔍 [useReportsAPI] Generated at:', result.data?.generatedAt);
        console.log('🔍 [useReportsAPI] Summary data:', JSON.stringify(result.data?.summary, null, 2));
        console.log('🔍 [useReportsAPI] Report data keys:', Object.keys(result.data?.reportData || {}));
        console.log('🔍 [useReportsAPI] Available filters:', JSON.stringify(result.data?.filters?.available, null, 2));
        console.log('🔍 [useReportsAPI] Applied filters:', JSON.stringify(result.data?.filters?.applied, null, 2));
        
        // Log detailed report data based on type
        if (result.data?.reportData) {
          const reportData = result.data.reportData;
          console.log('🔍 [useReportsAPI] ===== DETAILED REPORT DATA =====');
          
          if (reportData.inventory) {
            console.log('🔍 [useReportsAPI] Inventory Summary:');
            console.log('  - Total Value:', reportData.inventory.totalValue);
            console.log('  - Total Items:', reportData.inventory.totalItems);
            console.log('  - Low Stock Items:', reportData.inventory.lowStockItems);
            console.log('  - Top Brands:', reportData.inventory.topBrands);
            console.log('  - Recent Activity:', reportData.inventory.recentActivity);
            console.log('  - Filtered Inventory Count:', reportData.inventory.filteredInventory?.length || 0);
          }
          
          if (reportData.sales) {
            console.log('🔍 [useReportsAPI] Sales Summary:');
            console.log('  - Total Sales:', reportData.sales.totalSales);
            console.log('  - Total Profit:', reportData.sales.totalProfit);
            console.log('  - Total Items:', reportData.sales.totalItems);
            console.log('  - Completed Sales:', reportData.sales.completedSales);
            console.log('  - Refunded Sales:', reportData.sales.refundedSales);
            console.log('  - Refunded Amount:', reportData.sales.refundedAmount);
          }
          
          if (reportData.value) {
            console.log('🔍 [useReportsAPI] Value Report:');
            console.log('  - Total Value:', reportData.value.totalValue);
            console.log('  - Value by Store:', reportData.value.valueByStore?.length || 0, 'stores');
            console.log('  - Value by Brand:', reportData.value.valueByBrand?.length || 0, 'brands');
          }
          
          if (reportData.storeValue) {
            console.log('🔍 [useReportsAPI] Store Value Report:');
            console.log('  - Store Count:', reportData.storeValue.length);
            reportData.storeValue.forEach((store: any, index: number) => {
              console.log(`  - Store ${index + 1}: ${store.storeName} - $${store.totalValue.toFixed(2)} (${store.itemCount} items)`);
            });
          }
        }
        
        console.log('🔍 [useReportsAPI] ===== END API RESPONSE LOG =====');
        
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
