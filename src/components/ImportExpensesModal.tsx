'use client';

import { useState, useRef } from 'react';
import { useImportExpenses } from '@/hooks/useImportExpenses';
import Modal from './Modal';

interface ImportExpensesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function ImportExpensesModal({ isOpen, onClose, onSuccess }: ImportExpensesModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importResults, setImportResults] = useState<{
    expensesCreated: number;
    errors: string[];
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { importExpenses, isLoading, error } = useImportExpenses();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'text/csv') {
      setSelectedFile(file);
      setImportResults(null);
    } else if (file) {
      alert('Please select a CSV file');
    }
  };

  const handleImport = async () => {
    if (!selectedFile) return;

    const results = await importExpenses(selectedFile);
    if (results) {
      setImportResults(results);
      if (results.expensesCreated > 0 && results.errors.length === 0) {
        onSuccess?.();
      }
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setImportResults(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Modal open={isOpen} onClose={handleClose}>
      <div className="space-y-4">
        <h2 className="text-xl font-bold mb-2">Import Expenses from CSV</h2>
        <p className="text-muted-foreground text-sm mb-2">
          Upload a CSV file with expense details. The system will match cards by name. You can download a template below.
        </p>
        <a
          href="/expenses-import-template.csv"
          download
          className="inline-block mb-2 text-blue-600 hover:underline text-sm"
        >
          Download CSV Template
        </a>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileSelect}
          className="block w-full text-sm text-gray-700 border border-gray-300 rounded-lg cursor-pointer focus:outline-none"
        />
        {selectedFile && (
          <p className="text-sm text-green-600">Selected: {selectedFile.name}</p>
        )}
        {error && (
          <p className="text-sm text-red-600">Error: {error}</p>
        )}
        {importResults && (
          <div className="bg-gray-50 p-3 rounded-lg">
            <h3 className="font-semibold mb-2">Import Results:</h3>
            <ul className="text-sm space-y-1">
              <li>Expenses created: {importResults.expensesCreated}</li>
            </ul>
            {importResults.errors.length > 0 && (
              <div className="mt-2">
                <h4 className="font-semibold text-red-600">Errors:</h4>
                <ul className="text-sm text-red-600 space-y-1">
                  {importResults.errors.map((error: string, index: number) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
        <div className="flex justify-end space-x-2 mt-4">
          <button
            className="px-4 py-2 rounded bg-gray-200 text-gray-800 hover:bg-gray-300"
            onClick={handleClose}
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            onClick={handleImport}
            disabled={!selectedFile || isLoading}
          >
            {isLoading ? 'Importing...' : 'Import'}
          </button>
        </div>
      </div>
    </Modal>
  );
} 
