import React from 'react';
import { LoadingIcon } from '@/utils/icons';

const base = 'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50';
const variants = {
  primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
  secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
  destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
  outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
  ghost: 'hover:bg-accent hover:text-accent-foreground',
};
const sizes = {
  sm: 'h-9 rounded-md px-3',
  md: 'h-10 px-4 py-2',
  lg: 'h-11 rounded-md px-8',
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading = false, className = '', children, ...props }, ref) => (
    <button
      ref={ref}
      className={[
        base,
        variants[variant],
        sizes[size],
        className
      ].join(' ')}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && (
        <span className="-ml-1 mr-2 h-4 w-4 text-primary-foreground">
          <LoadingIcon />
        </span>
      )}
      {children}
    </button>
  )
);
Button.displayName = 'Button';
export default Button; 
