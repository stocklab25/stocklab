import React from 'react';

const variants = {
  info: 'bg-info text-info-foreground',
  success: 'bg-success text-success-foreground',
  warning: 'bg-warning text-warning-foreground',
  error: 'bg-destructive text-destructive-foreground',
};

export default function Alert({ title, description, variant = 'info', className = '' }: { title: string; description?: string; variant?: keyof typeof variants; className?: string }) {
  return (
    <div className={["rounded-lg p-4 flex flex-col gap-1", variants[variant], className].join(' ')}>
      <span className="font-semibold">{title}</span>
      {description && <span className="text-sm opacity-80">{description}</span>}
    </div>
  );
} 