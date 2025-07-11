import React, { useState } from 'react';

export interface DropdownItem {
  label: string;
  onClick: () => void;
}

export default function Dropdown({ items, buttonLabel }: { items: DropdownItem[]; buttonLabel: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative inline-block text-left">
      <button onClick={() => setOpen(v => !v)} className="btn btn-secondary">
        {buttonLabel}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-40 rounded-md shadow-lg bg-card ring-1 ring-black ring-opacity-5 z-10">
          <div className="py-1">
            {items.map((item, i) => (
              <button key={i} onClick={() => { setOpen(false); item.onClick(); }} className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-muted">
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 
