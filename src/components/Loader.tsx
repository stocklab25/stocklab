import React from 'react';

interface LoaderProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'spinner' | 'dots' | 'pulse';
  className?: string;
}

export default function Loader({ size = 'md', variant = 'spinner', className = '' }: LoaderProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  const spinner = (
    <div className={`animate-spin rounded-full border-2 border-gray-300 border-t-primary ${sizeClasses[size]} ${className}`} />
  );

  const dots = (
    <div className={`flex space-x-1 ${className}`}>
      <div className={`bg-primary rounded-full animate-bounce ${size === 'sm' ? 'w-1 h-1' : size === 'md' ? 'w-2 h-2' : 'w-3 h-3'}`} style={{ animationDelay: '0ms' }} />
      <div className={`bg-primary rounded-full animate-bounce ${size === 'sm' ? 'w-1 h-1' : size === 'md' ? 'w-2 h-2' : 'w-3 h-3'}`} style={{ animationDelay: '150ms' }} />
      <div className={`bg-primary rounded-full animate-bounce ${size === 'sm' ? 'w-1 h-1' : size === 'md' ? 'w-2 h-2' : 'w-3 h-3'}`} style={{ animationDelay: '300ms' }} />
    </div>
  );

  const pulse = (
    <div className={`bg-primary rounded-full animate-pulse ${sizeClasses[size]} ${className}`} />
  );

  switch (variant) {
    case 'dots':
      return dots;
    case 'pulse':
      return pulse;
    default:
      return spinner;
  }
}

// Page loading component
export function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center space-y-4">
        <Loader size="lg" variant="spinner" className="mx-auto" />
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

// Navigation loading component
export function NavigationLoader() {
  return (
    <div className="flex items-center justify-center h-16">
      <Loader size="md" variant="dots" />
    </div>
  );
} 
