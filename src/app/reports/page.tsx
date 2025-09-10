'use client';

import { useState, useMemo } from 'react';
import Layout from '@/components/Layout';
import { Card } from '@/components/Card';
import { PageLoader } from '@/components/Loader';
import { useReportsAPI } from '@/hooks/useReportsAPI';
import InventorySummaryChart from '@/components/charts/InventorySummaryChart';
import ValueReportChart from '@/components/charts/ValueReportChart';
import SalesByStoreReport from '@/components/reports/SalesByStoreReport';
import TrendsAnalysisChart from '@/components/charts/TrendsAnalysisChart';
import ExportReportsModal from '@/components/ExportReportsModal';

interface ReportFilters {
  type: string;
  store: string;
  startDate?: string;
  endDate?: string;
  status: string;
  itemType: string;
}

export default function Reports() {
  const [selectedReport, setSelectedReport] = useState<string>('summary');
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  
  // Filter state
  const [filters, setFilters] = useState<ReportFilters>({
    type: 'summary',
    store: 'all',
    startDate: '',
    endDate: '',
    status: 'all',
    itemType: 'all'
  });

  // Memoize filters to prevent unnecessary re-renders
  const memoizedFilters = useMemo(() => ({
    ...filters,
    type: selectedReport
  }), [filters, selectedReport]);

  const { data, isLoading, error } = useReportsAPI(memoizedFilters);

  // Update filters when report type changes
  const handleReportChange = (reportType: string) => {
    setSelectedReport(reportType);
    setFilters(prev => ({ ...prev, type: reportType }));
  };

  // Handle filter changes
  const handleFilterChange = (key: keyof ReportFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      type: selectedReport,
      store: 'all',
      startDate: '',
      endDate: '',
      status: 'all',
      itemType: 'all'
    });
  };

  if (isLoading) {
    return (
      <Layout>
        <PageLoader />
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="space-y-6">
          <div className="p-6 bg-red-100 border border-red-300 rounded-lg">
            <h2 className="text-lg font-semibold text-red-800">Error Loading Reports</h2>
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!data?.success) {
    return (
      <Layout>
        <div className="space-y-6">
          <div className="p-6 bg-yellow-100 border border-yellow-300 rounded-lg">
            <h2 className="text-lg font-semibold text-yellow-800">No Data Available</h2>
            <p className="text-yellow-700">Unable to load report data. Please try again.</p>
          </div>
        </div>
      </Layout>
    );
  }

  const reportData = data.data.reportData;
  const summaryData = data.data.summary;
  const availableFilters = data.data.filters.available;

  return (
    <Layout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Reports</h1>
            <p className="text-muted-foreground mt-2">
              Analytics and insights for your inventory
              {data.data.processingTime && (
                <span className="text-sm ml-2">
                  (Generated in {data.data.processingTime}ms)
                </span>
              )}
            </p>
          </div>
          <button 
            onClick={() => setIsExportModalOpen(true)}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
                          Export Report
          </button>
        </div>

        {/* Key Metrics - Only show for Inventory Summary */}
        {selectedReport === 'summary' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <div className="p-6">
              <p className="text-sm font-medium text-muted-foreground">Total Inventory Value</p>
                <p className="text-2xl font-bold text-foreground">
                  ${summaryData.totalInventoryValue.toLocaleString(undefined, { 
                    minimumFractionDigits: 2, 
                    maximumFractionDigits: 2 
                  })}
                </p>
            </div>
          </Card>

          <Card>
            <div className="p-6">
              <p className="text-sm font-medium text-muted-foreground">Total Items</p>
                <p className="text-2xl font-bold text-foreground">{summaryData.totalItems}</p>
              </div>
            </Card>

            <Card>
              <div className="p-6">
                <p className="text-sm font-medium text-muted-foreground">Active Stores</p>
                <p className="text-2xl font-bold text-foreground">{summaryData.activeStores}</p>
            </div>
          </Card>
        </div>
        )}

        {/* Report Selection */}
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Select Report Type</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4">
              {[
                { id: 'summary', name: 'Inventory Summary', description: 'Overview of all items' },
                { id: 'value', name: 'Value Report', description: 'Total inventory value' },
                { id: 'sales', name: 'Sales by Store', description: 'Revenue based on sold items' },
                { id: 'trends', name: 'Trends Analysis', description: 'Sales and stock trends' },
                { id: 'monthly', name: 'Monthly Report', description: 'This month\'s sales & profit' },
                { id: 'annual', name: 'Annual Report', description: 'This year\'s sales & profit' },
                { id: 'store-value', name: 'Store Investment', description: 'Total value per store' }
              ].map((report) => (
              <button 
                  key={report.id}
                  onClick={() => handleReportChange(report.id)}
                className={`p-4 text-left border rounded-lg transition-colors ${
                    selectedReport === report.id 
                    ? 'border-primary bg-primary/10' 
                    : 'border-border hover:border-primary hover:bg-accent'
                }`}
              >
                <div>
                    <p className="font-medium text-foreground">{report.name}</p>
                    <p className="text-sm text-muted-foreground">{report.description}</p>
                </div>
              </button>
              ))}
            </div>
          </div>
        </Card>

        {/* Filters - Hide for Monthly and Annual reports */}
        {selectedReport !== 'monthly' && selectedReport !== 'annual' && (
          <Card>
            <div className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Filters</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Store</label>
                  <select
                  value={filters.store}
                  onChange={(e) => handleFilterChange('store', e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="all">All Stores</option>
                  {availableFilters.stores.map((store) => (
                      <option key={store.id} value={store.id}>
                        {store.name}
                      </option>
                    ))}
                  </select>
                </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="all">All Statuses</option>
                  {availableFilters.statuses.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Item Type</label>
                <select
                  value={filters.itemType}
                  onChange={(e) => handleFilterChange('itemType', e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="all">All Types</option>
                  {availableFilters.itemTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

                <div className="flex items-end space-x-2">
                  <button
                  onClick={clearFilters}
                    className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    Clear Filters
                  </button>
                </div>
              </div>

            {/* Date Range Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Start Date</label>
                <input
                  type="date"
                  value={filters.startDate || ''}
                  onChange={(e) => handleFilterChange('startDate', e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">End Date</label>
                <input
                  type="date"
                  value={filters.endDate || ''}
                  onChange={(e) => handleFilterChange('endDate', e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          </div>
        </Card>
        )}

        {/* Report Content */}
        {selectedReport === 'summary' && reportData.inventory && (
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Inventory Summary</h3>
              <InventorySummaryChart inventory={reportData.inventory.filteredInventory} />
                </div>
          </Card>
        )}

        {selectedReport === 'value' && reportData.value && (
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Value Report (Warehouse Inventory)</h3>
              <div className="mb-4">
                <p className="text-sm text-muted-foreground">Total Warehouse Value: ${reportData.value.totalValue.toLocaleString(undefined, { 
                  minimumFractionDigits: 2, 
                  maximumFractionDigits: 2 
                })}</p>
              </div>
              <ValueReportChart inventory={reportData.value.filteredInventory || []} />
            </div>
          </Card>
        )}

        {selectedReport === 'sales' && reportData.sales && (
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Sales Report</h3>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Sales</p>
                  <p className="text-2xl font-bold text-foreground">
                    ${reportData.sales.totalSales.toLocaleString(undefined, { 
                      minimumFractionDigits: 2, 
                      maximumFractionDigits: 2 
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Profit</p>
                  <p className="text-2xl font-bold text-foreground">
                    ${reportData.sales.totalProfit.toLocaleString(undefined, { 
                      minimumFractionDigits: 2, 
                      maximumFractionDigits: 2 
                    })}
                  </p>
                  </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Items Sold</p>
                  <p className="text-2xl font-bold text-foreground">{reportData.sales.totalItems}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Completed Sales</p>
                  <p className="text-2xl font-bold text-green-600">{reportData.sales.completedSales}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Refunded Sales</p>
                  <p className="text-2xl font-bold text-orange-600">{reportData.sales.refundedSales}</p>
                </div>
              </div>
            </div>
          </Card>
        )}

        {selectedReport === 'monthly' && reportData.sales && (
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Monthly Report</h3>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Sales</p>
                  <p className="text-2xl font-bold text-foreground">
                    ${reportData.sales.totalSales.toLocaleString(undefined, { 
                      minimumFractionDigits: 2, 
                      maximumFractionDigits: 2 
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Profit</p>
                  <p className="text-2xl font-bold text-foreground">
                    ${reportData.sales.totalProfit.toLocaleString(undefined, { 
                      minimumFractionDigits: 2, 
                      maximumFractionDigits: 2 
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Items Sold</p>
                  <p className="text-2xl font-bold text-foreground">{reportData.sales.totalItems}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Completed Sales</p>
                  <p className="text-2xl font-bold text-green-600">{reportData.sales.completedSales}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Refunded Sales</p>
                  <p className="text-2xl font-bold text-orange-600">{reportData.sales.refundedSales}</p>
                </div>
              </div>
            </div>
          </Card>
        )}

        {selectedReport === 'annual' && reportData.sales && (
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Annual Report</h3>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Sales</p>
                  <p className="text-2xl font-bold text-foreground">
                    ${reportData.sales.totalSales.toLocaleString(undefined, { 
                      minimumFractionDigits: 2, 
                      maximumFractionDigits: 2 
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Profit</p>
                  <p className="text-2xl font-bold text-foreground">
                    ${reportData.sales.totalProfit.toLocaleString(undefined, { 
                      minimumFractionDigits: 2, 
                      maximumFractionDigits: 2 
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Items Sold</p>
                  <p className="text-2xl font-bold text-foreground">{reportData.sales.totalItems}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Completed Sales</p>
                  <p className="text-2xl font-bold text-green-600">{reportData.sales.completedSales}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Refunded Sales</p>
                  <p className="text-2xl font-bold text-orange-600">{reportData.sales.refundedSales}</p>
                </div>
              </div>
            </div>
          </Card>
        )}

        {selectedReport === 'trends' && reportData.trends && (
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Trends Analysis</h3>
              <TrendsAnalysisChart 
                sales={reportData.trends.sales || []} 
                transactions={reportData.trends.transactions || []}
                storeTrends={reportData.trends.storeTrends || []}
                brandTrends={reportData.trends.brandTrends || []}
                itemTypeTrends={reportData.trends.itemTypeTrends || []}
                allMonths={reportData.trends.allMonths || []}
              />
            </div>
          </Card>
        )}

        {selectedReport === 'store-value' && reportData.storeValue && (
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Store Investment Monitoring (Store Inventory)</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {reportData.storeValue.map((store: any, index: number) => (
                    <div key={store.storeId} className="p-4 border border-border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-foreground">{store.storeName}</h4>
                        <span className="text-sm text-muted-foreground">#{index + 1}</span>
                      </div>
                      <div className="space-y-2">
                        <div>
                          <p className="text-sm text-muted-foreground">Total Value</p>
                          <p className="text-xl font-bold text-foreground">
                            ${store.totalValue.toLocaleString(undefined, { 
                              minimumFractionDigits: 2, 
                              maximumFractionDigits: 2 
                            })}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Items in Stock</p>
                          <p className="text-lg font-semibold text-foreground">{store.itemCount}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-6 p-4 bg-muted rounded-lg">
                  <h4 className="font-medium text-foreground mb-2">Investment Summary</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Investment Across All Stores</p>
                      <p className="text-xl font-bold text-foreground">
                        ${reportData.storeValue.reduce((sum: number, store: any) => sum + store.totalValue, 0).toLocaleString(undefined, { 
                          minimumFractionDigits: 2, 
                          maximumFractionDigits: 2 
                        })}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Average Value Per Store</p>
                      <p className="text-xl font-bold text-foreground">
                        ${(reportData.storeValue.reduce((sum: number, store: any) => sum + store.totalValue, 0) / reportData.storeValue.length).toLocaleString(undefined, { 
                          minimumFractionDigits: 2, 
                          maximumFractionDigits: 2 
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Export Modal */}
        <ExportReportsModal 
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
        />
      </div>
    </Layout>
  );
} 