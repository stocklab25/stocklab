import React from 'react';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className = '', ...props }, ref) => (
    <div className="mb-4">
      {label && <label className="block text-sm font-medium mb-2">{label}</label>}
      <textarea ref={ref} className={["input min-h-[100px]", className].join(' ')} {...props} />
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  )
);
Textarea.displayName = 'Textarea';
export default Textarea; 
