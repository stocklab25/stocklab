'use client';

import { useState } from 'react';

interface DeleteStoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  storeName: string;
  onDelete: () => Promise<void>;
  loading: boolean;
  error: string | null;
}

export default function DeleteStoreModal({ 
  isOpen, 
  onClose, 
  onSuccess, 
  storeName, 
  onDelete, 
  loading, 
  error 
}: DeleteStoreModalProps) {
  const [confirmationText, setConfirmationText] = useState('');
  const [step, setStep] = useState<'warning' | 'confirmation'>('warning');

  const handleDeleteStore = async () => {
    if (confirmationText !== 'DELETE STORE') {
      return;
    }

    const result = await onDelete();
    if (result !== undefined) {
      onSuccess();
      onClose();
      // Reset state
      setConfirmationText('');
      setStep('warning');
    }
  };

  const handleClose = () => {
    onClose();
    // Reset state
    setConfirmationText('');
    setStep('warning');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50">
      <div className="bg-background rounded-lg shadow-2xl border border-white/10 backdrop-blur-sm p-6 w-1/2 mx-4 animate-in zoom-in-95 duration-200">
        {step === 'warning' ? (
          <>
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mr-3">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-foreground">Delete Store</h2>
            </div>
            
            <div className="mb-6">
              <p className="text-foreground mb-4">
                You are about to delete the store <strong>"{storeName}"</strong>. This action will:
              </p>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 mb-4">
                <li>Remove the store from your system</li>
                <li>Delete all store inventory records</li>
                <li>Remove all sales records associated with this store</li>
                <li>Delete all transfer transactions to/from this store</li>
                <li>Remove store-specific SKU configurations</li>
                <li>Delete all historical data for this location</li>
              </ul>
              <p className="text-sm text-red-600 font-medium">
                ⚠️ This action cannot be undone!
              </p>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={handleClose}
                className="flex-1 px-4 py-2 border border-input rounded-lg text-foreground hover:bg-accent transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => setStep('confirmation')}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                I Understand, Continue
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mr-3">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-foreground">Final Confirmation</h2>
            </div>
            
            <div className="mb-6">
              <p className="text-foreground mb-4">
                To confirm deletion of <strong>"{storeName}"</strong>, please type <strong>"DELETE STORE"</strong> in the field below:
              </p>
              <input
                type="text"
                value={confirmationText}
                onChange={(e) => setConfirmationText(e.target.value)}
                placeholder="DELETE STORE"
                className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
              {error && (
                <p className="text-red-600 text-sm mt-2">{error}</p>
              )}
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setStep('warning')}
                className="flex-1 px-4 py-2 border border-input rounded-lg text-foreground hover:bg-accent transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleDeleteStore}
                disabled={confirmationText !== 'DELETE STORE' || loading}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Deleting Store...' : 'Delete Store'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
