import React from 'react';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  width?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl';
}

export default function Modal({ open, onClose, children, width = 'lg' }: ModalProps) {
  if (!open) return null;
  
  const widthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
    '6xl': 'max-w-6xl',
    '7xl': 'max-w-7xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{
      backgroundColor: 'rgba(0, 0, 0, 0.3)',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)'
    }}>
              <div className={`bg-background rounded-lg shadow-2xl border border-white/10 p-6 relative min-w-[320px] w-[1000px] max-h-[90vh] overflow-y-auto backdrop-blur-sm animate-in zoom-in-95 duration-200`}>
        <button onClick={onClose} className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 text-xl font-bold z-10">&times;</button>
        {children}
      </div>
    </div>
  );
} 
