import React from 'react';

export default function PageContainer({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={["container mx-auto px-4 py-8", className].join(' ')}>
      {children}
    </div>
  );
} 