'use client';

import { useState } from 'react';
import { useWipeData } from '@/hooks/useWipeData';

interface WipeDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function WipeDataModal({ isOpen, onClose, onSuccess }: WipeDataModalProps) {
  const [confirmationText, setConfirmationText] = useState('');
  const [step, setStep] = useState<'warning' | 'confirmation'>('warning');
  const { wipeData, loading, error } = useWipeData();

  const handleWipeData = async () => {
    if (confirmationText !== 'WIPE ALL DATA') {
      return;
    }

    const result = await wipeData();
    if (result?.success) {
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
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-background rounded-lg p-6 w-1/2 mx-4">
        {step === 'warning' ? (
          <>
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mr-3">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-foreground">Danger Zone</h2>
            </div>
            
            <div className="mb-6">
              <p className="text-foreground mb-4">
                This action will <strong>permanently delete</strong> all data from your system:
              </p>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 mb-4">
                <li>All products</li>
                <li>All inventory items</li>
                <li>All transactions</li>
                <li>All historical data</li>
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
                To confirm this action, please type <strong>"WIPE ALL DATA"</strong> in the field below:
              </p>
              <input
                type="text"
                value={confirmationText}
                onChange={(e) => setConfirmationText(e.target.value)}
                placeholder="WIPE ALL DATA"
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
                onClick={handleWipeData}
                disabled={confirmationText !== 'WIPE ALL DATA' || loading}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Wiping Data...' : 'Wipe All Data'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
} 