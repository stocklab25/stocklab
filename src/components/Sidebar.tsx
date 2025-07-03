'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavItem {
  name: string;
  href: string;
  icon: string;
}

const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/', icon: '📊' },
  { name: 'Products', href: '/products', icon: '👟' },
  { name: 'Inventory', href: '/inventory', icon: '📦' },
  { name: 'Transactions', href: '/transactions', icon: '🔄' },
  { name: 'Reports', href: '/reports', icon: '📈' },
  { name: 'Settings', href: '/settings', icon: '⚙️' },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  return (
    <div className={`bg-background border-r border-border transition-all duration-300 ${
      collapsed ? 'w-16' : 'w-64'
    }`}>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          {!collapsed && (
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">SL</span>
              </div>
              <span className="font-semibold text-foreground">Stock Lab</span>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 rounded-md hover:bg-accent transition-colors"
          >
            <span className="text-muted-foreground">
              {collapsed ? '→' : '←'}
            </span>
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent'
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                {!collapsed && (
                  <span className="font-medium">{item.name}</span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-border">
          {!collapsed && (
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                <span className="text-muted-foreground text-sm">👤</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Admin User</p>
                <p className="text-xs text-muted-foreground">admin@stocklab.com</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 