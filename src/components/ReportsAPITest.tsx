'use client';

import { useState, useMemo } from 'react';
import { useReportsAPI } from '@/hooks/useReportsAPI';
import { Card } from '@/components/Card';

export default function ReportsAPITest() {
  const [currentFilters, setCurrentFilters] = useState({
    type: 'summary',
    store: 'all',
    startDate: '',
    endDate: '',
    status: 'all',
    itemType: 'all'
  });

  // Memoize filters to prevent unnecessary re-renders
  const memoizedFilters = useMemo(() => currentFilters, [
    currentFilters.type,
    currentFilters.store,
    currentFilters.startDate,
    currentFilters.endDate,
    currentFilters.status,
    currentFilters.itemType
  ]);
  
  const { data, isLoading, error } = useReportsAPI(memoizedFilters);

  const handleFilterChange = (key: string, value: string) => {
    setCurrentFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const testAllReportTypes = () => {
    const reportTypes = ['summary', 'value', 'sales', 'monthly', 'annual', 'store-value'];
    reportTypes.forEach((type, index) => {
      setTimeout(() => {
        console.log(`🔍 [ReportsAPITest] Testing report type: ${type}`);
        setCurrentFilters(prev => ({ ...prev, type }));
      }, index * 2000); // 2 second delay between each test
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-4">Reports API Test</h2>
          
          {/* Filter Controls */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium mb-2">Report Type</label>
              <select
                value={currentFilters.type}
                onChange={(e) => handleFilterChange('type', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="summary">Inventory Summary</option>
                <option value="value">Value Report</option>
                <option value="sales">Sales Report</option>
                <option value="monthly">Monthly Report</option>
                <option value="annual">Annual Report</option>
                <option value="store-value">Store Value Report</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Store</label>
              <select
                value={currentFilters.store}
                onChange={(e) => handleFilterChange('store', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="all">All Stores</option>
                {/* Add store options dynamically */}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Status</label>
              <select
                value={currentFilters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="all">All Statuses</option>
                <option value="COMPLETED">Completed</option>
                <option value="REFUNDED">Refunded</option>
                <option value="IN_STOCK">In Stock</option>
                <option value="SOLD">Sold</option>
              </select>
            </div>
          </div>

          {/* Test Buttons */}
          <div className="flex space-x-4 mb-6">
            <button
              onClick={() => setCurrentFilters(prev => ({ ...prev, type: 'summary' }))}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Test Summary Report
            </button>
            <button
              onClick={() => setCurrentFilters(prev => ({ ...prev, type: 'sales' }))}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Test Sales Report
            </button>
            <button
              onClick={() => setCurrentFilters(prev => ({ ...prev, type: 'store-value' }))}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              Test Store Value Report
            </button>
            <button
              onClick={testAllReportTypes}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
            >
              Test All Report Types
            </button>
          </div>

          {/* Current Filters Display */}
          <div className="mb-4 p-4 bg-gray-100 rounded-lg">
            <h3 className="font-semibold mb-2">Current Filters:</h3>
            <pre className="text-sm">{JSON.stringify(currentFilters, null, 2)}</pre>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="p-4 bg-yellow-100 border border-yellow-300 rounded-lg">
              <p className="text-yellow-800">Loading report data... Check console for detailed logs.</p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="p-4 bg-red-100 border border-red-300 rounded-lg">
              <p className="text-red-800">Error: {error}</p>
            </div>
          )}

          {/* Success State */}
          {data && data.success && (
            <div className="space-y-4">
              <div className="p-4 bg-green-100 border border-green-300 rounded-lg">
                <p className="text-green-800">✅ Report generated successfully!</p>
                <p className="text-sm text-green-700">
                  Processing time: {data.data.processingTime}ms | 
                  Generated at: {new Date(data.data.generatedAt).toLocaleString()}
                </p>
              </div>

              {/* Summary Data */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-4 bg-white border rounded-lg">
                  <p className="text-sm text-gray-600">Total Inventory Value</p>
                  <p className="text-2xl font-bold">${data.data.summary.totalInventoryValue.toLocaleString()}</p>
                </div>
                <div className="p-4 bg-white border rounded-lg">
                  <p className="text-sm text-gray-600">Total Items</p>
                  <p className="text-2xl font-bold">{data.data.summary.totalItems}</p>
                </div>
                <div className="p-4 bg-white border rounded-lg">
                  <p className="text-sm text-gray-600">Low Stock Items</p>
                  <p className="text-2xl font-bold">{data.data.summary.lowStockItems}</p>
                </div>
                <div className="p-4 bg-white border rounded-lg">
                  <p className="text-sm text-gray-600">Active Stores</p>
                  <p className="text-2xl font-bold">{data.data.summary.activeStores}</p>
                </div>
              </div>

              {/* Report Data Preview */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold mb-2">Report Data Preview:</h3>
                <pre className="text-xs overflow-auto max-h-96">
                  {JSON.stringify(data.data.reportData, null, 2)}
                </pre>
              </div>

              {/* Available Filters */}
              <div className="p-4 bg-blue-50 rounded-lg">
                <h3 className="font-semibold mb-2">Available Filters:</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="font-medium">Stores ({data.data.filters.available.stores.length}):</p>
                    <ul className="list-disc list-inside">
                      {data.data.filters.available.stores.slice(0, 5).map((store: any) => (
                        <li key={store.id}>{store.name}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="font-medium">Statuses:</p>
                    <ul className="list-disc list-inside">
                      {data.data.filters.available.statuses.map((status: string) => (
                        <li key={status}>{status}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="font-medium">Item Types:</p>
                    <ul className="list-disc list-inside">
                      {data.data.filters.available.itemTypes.map((type: string) => (
                        <li key={type}>{type}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
