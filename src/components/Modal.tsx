import React from 'react';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export default function Modal({ open, onClose, children }: ModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-card rounded-lg shadow-xl p-6 relative min-w-[320px] max-w-lg w-full">
        <button onClick={onClose} className="absolute top-2 right-2 text-muted-foreground hover:text-foreground dark:hover:text-primary-foreground text-xl font-bold">&times;</button>
        {children}
      </div>
    </div>
  );
} 