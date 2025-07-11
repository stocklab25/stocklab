import React from 'react';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, className = '', children, ...props }, ref) => (
    <div className="mb-4">
      {label && <label className="block text-sm font-medium mb-2">{label}</label>}
      <select ref={ref} className={["input", className].join(' ')} {...props}>
        {children}
      </select>
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  )
);
Select.displayName = 'Select';
export default Select; 
