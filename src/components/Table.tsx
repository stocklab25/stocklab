import React from 'react';

export function Table({ className = '', ...props }: React.HTMLAttributes<HTMLTableElement>) {
  return <table className={["table", className].join(' ')} {...props} />;
}
export function TableHeader({ className = '', ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={["table-header", className].join(' ')} {...props} />;
}
export function TableBody({ className = '', ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={["table-body", className].join(' ')} {...props} />;
}
export function TableRow({ className = '', ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={["table-row", className].join(' ')} {...props} />;
}
export function TableHead({ className = '', ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return <th className={["table-head", className].join(' ')} {...props} />;
}
export function TableCell({ className = '', ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={["table-cell", className].join(' ')} {...props} />;
} 