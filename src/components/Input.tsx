import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', ...props }, ref) => (
    <div className="mb-4">
      {label && <label className="block text-sm font-medium mb-2">{label}</label>}
      <input ref={ref} className={["input", className].join(' ')} {...props} />
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  )
);
Input.displayName = 'Input';
export default Input; 