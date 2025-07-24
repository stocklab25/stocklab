'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { InventoryIcon, StoreInventoryIcon, AccountingIcon, PurchaseOrdersIcon, CardsIcon } from '@/utils/icons';

interface ExportReportsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ExportOption {
  id: string;
  label: string;
  description: string;
  icon: React.ReactElement;
}

const exportOptions: { id: string; label: string; description: string }[] = [
  {
    id: 'inventory',
    label: 'Inventory Report',
    description: 'All inventory items with product details',
  },
  {
    id: 'store-inventory',
    label: 'Store Inventory Report',
    description: 'Inventory at each store location',
  },
  {
    id: 'inventory-summary',
    label: 'Inventory Summary Report',
    description: 'Inventory summary with brand and condition distribution',
  },
  {
    id: 'value-report',
    label: 'Value Report',
    description: 'Inventory value analysis by brand and cost ranges',
  },
  {
    id: 'sales',
    label: 'Sales Report',
    description: 'All sales transactions with product and store info',
  },
  {
    id: 'monthly-sales',
    label: 'Monthly Sales Report',
    description: 'Sales and profit for the current month',
  },
  {
    id: 'annual-sales',
    label: 'Annual Sales Report',
    description: 'Sales and profit for the current year',
  },
  {
    id: 'purchase-orders',
    label: 'Purchase Orders Report',
    description: 'All purchase orders with vendor details',
  },
  {
    id: 'expenses',
    label: 'Expenses Report',
    description: 'Expense tracking with card details',
  },
];

export default function ExportReportsModal({ isOpen, onClose }: ExportReportsModalProps) {
  const [selectedReports, setSelectedReports] = useState<string[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [currentExport, setCurrentExport] = useState<string>('');
  const { getAuthToken } = useAuth();

  const handleReportToggle = (reportId: string) => {
    setSelectedReports(prev => 
      prev.includes(reportId) 
        ? prev.filter(id => id !== reportId)
        : [...prev, reportId]
    );
  };

  const handleSelectAll = () => {
    setSelectedReports(exportOptions.map(option => option.id));
  };

  const handleSelectNone = () => {
    setSelectedReports([]);
  };

  const exportToCSV = async () => {
    if (selectedReports.length === 0) return;

    setIsExporting(true);
    setCurrentExport('');
    const failedReports: string[] = [];
    const successfulReports: string[] = [];
    
    try {
      for (let i = 0; i < selectedReports.length; i++) {
        const reportId = selectedReports[i];
        const reportLabel = exportOptions.find(opt => opt.id === reportId)?.label || reportId;
        setCurrentExport(`Exporting ${reportLabel}...`);
        
        const result = await downloadReport(reportId);
        
        if (result.success) {
          successfulReports.push(reportLabel);
        } else {
          console.error(`Failed to export ${reportLabel}:`, result.message);
          
          // Check if it's a "no data" error
          if (result.message.includes('No data available')) {
            failedReports.push(`${reportLabel} (no data available)`);
          } else {
            failedReports.push(reportLabel);
          }
        }
        
        // Add a small delay between downloads to prevent browser blocking
        if (i < selectedReports.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
      // Show results
      if (successfulReports.length > 0 && failedReports.length === 0) {
        // All successful
        alert(`Successfully exported ${successfulReports.length} report${successfulReports.length !== 1 ? 's' : ''}!`);
      } else if (successfulReports.length > 0 && failedReports.length > 0) {
        // Some successful, some failed
        alert(`Exported ${successfulReports.length} report${successfulReports.length !== 1 ? 's' : ''} successfully.\n\nFailed to export:\n${failedReports.join('\n')}`);
      } else if (successfulReports.length === 0 && failedReports.length > 0) {
        // All failed
        alert(`No reports were exported.\n\nFailed to export:\n${failedReports.join('\n')}`);
      }
      
      onClose();
      setSelectedReports([]);
    } catch (error) {
      console.error('Export error:', error);
      alert('Export process failed. Please try again.');
    } finally {
      setIsExporting(false);
      setCurrentExport('');
    }
  };

  const downloadReport = async (reportId: string): Promise<{ success: boolean; message: string }> => {
    try {
      const token = await getAuthToken();
      if (!token) {
        return { success: false, message: 'No authentication token found' };
      }
      
      const response = await fetch(`/api/reports/export/${reportId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || response.statusText;
        
        // Check if it's a "no data" error
        if (errorMessage.includes('No data available') || response.status === 404) {
          return { success: false, message: `No data available for ${reportId} report` };
        }
        
        return { success: false, message: `Failed to export ${reportId}: ${errorMessage}` };
      }

      const blob = await response.blob();
      
      // Check if blob is empty or invalid
      if (blob.size === 0) {
        return { success: false, message: `Empty report generated for ${reportId}` };
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${reportId}-report-${new Date().toISOString().split('T')[0]}.csv`;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      setTimeout(() => {
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      }, 100);
      
      return { success: true, message: `Successfully exported ${reportId} report` };
      
    } catch (error) {
      console.error(`Error downloading ${reportId}:`, error);
      return { success: false, message: `Error downloading ${reportId}: ${error}` };
    }
  };

  const handleClose = () => {
    onClose();
    setSelectedReports([]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-background rounded-lg p-6 w-1/2 mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-foreground">Export Reports</h2>
          <button
            onClick={handleClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mb-6">
          <p className="text-muted-foreground mb-4">
            Select the reports you want to export as CSV files:
          </p>
          <p className="text-sm text-amber-600 mb-4">
            Note: Reports with no data will be skipped automatically.
          </p>
          
          <div className="flex space-x-3 mb-4">
            <button
              onClick={handleSelectAll}
              className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
            >
              Select All
            </button>
            <button
              onClick={handleSelectNone}
              className="px-3 py-1 text-sm border border-input text-foreground rounded hover:bg-accent transition-colors"
            >
              Select None
            </button>
          </div>
        </div>

        <div className="space-y-3 mb-6">
          {exportOptions.map((option) => (
            <label
              key={option.id}
              className="flex items-center p-4 border border-input rounded-lg hover:bg-accent cursor-pointer transition-colors"
            >
              <input
                type="checkbox"
                checked={selectedReports.includes(option.id)}
                onChange={() => handleReportToggle(option.id)}
                className="mr-3 h-4 w-4 text-primary focus:ring-primary border-input rounded"
              />
              <div className="flex-1">
                <p className="font-medium text-foreground">{option.label}</p>
                <p className="text-sm text-muted-foreground">{option.description}</p>
              </div>
            </label>
          ))}
        </div>

        <div className="flex justify-end space-x-3">
          <button
            onClick={handleClose}
            className="px-4 py-2 border border-input rounded-lg text-foreground hover:bg-accent transition-colors"
            disabled={isExporting}
          >
            Cancel
          </button>
          <button
            onClick={exportToCSV}
            disabled={selectedReports.length === 0 || isExporting}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExporting ? (currentExport || 'Exporting...') : `Export ${selectedReports.length} Report${selectedReports.length !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
} 
