import React from 'react';

const variants = {
  default: 'badge badge-default',
  secondary: 'badge badge-secondary',
  destructive: 'badge badge-destructive',
  outline: 'badge badge-outline',
  'in-stock': 'status-in-stock badge',
  'low-stock': 'status-low-stock badge',
  'out-of-stock': 'status-out-of-stock badge',
  discontinued: 'status-discontinued badge',
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: keyof typeof variants;
}

export default function Badge({ variant = 'default', className = '', ...props }: BadgeProps) {
  return <span className={[variants[variant], className].join(' ')} {...props} />;
} 