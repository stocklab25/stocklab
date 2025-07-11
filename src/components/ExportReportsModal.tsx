'use client';

import { useState } from 'react';

interface ExportReportsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ExportOption {
  id: string;
  label: string;
  description: string;
  icon: string;
}

const exportOptions: ExportOption[] = [
  {
    id: 'inventory',
    label: 'Inventory Report',
    description: 'Products and inventory items with details',
    icon: '📦'
  },
  {
    id: 'store-inventory',
    label: 'Store Inventory Report',
    description: 'Store inventory with product details',
    icon: '🏪'
  },
  {
    id: 'sales',
    label: 'Sales Report',
    description: 'Sales data with product and store details',
    icon: '💰'
  },
  {
    id: 'purchase-orders',
    label: 'Purchase Orders Report',
    description: 'Purchase orders with vendor details',
    icon: '📋'
  },
  {
    id: 'expenses',
    label: 'Expenses Report',
    description: 'Expense tracking with card details',
    icon: '💳'
  }
];

export default function ExportReportsModal({ isOpen, onClose }: ExportReportsModalProps) {
  const [selectedReports, setSelectedReports] = useState<string[]>([]);
  const [isExporting, setIsExporting] = useState(false);

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
    try {
      for (const reportId of selectedReports) {
        await downloadReport(reportId);
      }
      onClose();
      setSelectedReports([]);
    } catch (error) {
      
    } finally {
      setIsExporting(false);
    }
  };

  const downloadReport = async (reportId: string) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/reports/export/${reportId}`, {
        method: 'GET',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to export ${reportId}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${reportId}-report-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      
      throw error;
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
              <div className="flex items-center space-x-3 flex-1">
                <span className="text-2xl">{option.icon}</span>
                <div>
                  <p className="font-medium text-foreground">{option.label}</p>
                  <p className="text-sm text-muted-foreground">{option.description}</p>
                </div>
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
            {isExporting ? 'Exporting...' : `Export ${selectedReports.length} Report${selectedReports.length !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
} 
