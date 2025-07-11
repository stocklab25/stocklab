'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useNavigation } from '@/contexts/NavigationContext';

interface NavItem {
  name: string;
  href: string;
  icon: string;
}

interface NavGroup {
  name: string;
  icon: string;
  items: NavItem[];
}

const navigation: (NavItem | NavGroup)[] = [
  { name: 'Dashboard', href: '/', icon: '📊' },
  { name: 'Products', href: '/products', icon: '👟' },
  { name: 'Transactions', href: '/transactions', icon: '🔄' },
  { name: 'Inventory', href: '/inventory', icon: '📦' },
  { name: 'Store Inventory', href: '/store-inventory', icon: '🏪' },
  { name: 'Store Sales', href: '/store-sales', icon: '🛍️' },
  {
    name: 'Accounting',
    icon: '💰',
    items: [
      { name: 'Purchase Orders', href: '/purchase-orders', icon: '📋' },
      { name: 'Expenses', href: '/expenses', icon: '💸' },
      { name: 'Cards', href: '/cards', icon: '💳' },
    ]
  },
  { name: 'Reports', href: '/reports', icon: '📈' },
  { name: 'Settings', href: '/settings', icon: '⚙️' },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  const pathname = usePathname();
  const { setIsNavigating } = useNavigation();

  const handleNavigation = () => {
    setIsNavigating(true);
  };

  const toggleGroup = (groupName: string) => {
    setExpandedGroups(prev => 
      prev.includes(groupName) 
        ? prev.filter(name => name !== groupName)
        : [...prev, groupName]
    );
  };

  const isGroupExpanded = (groupName: string) => {
    return expandedGroups.includes(groupName);
  };

  const isActive = (href: string) => {
    return pathname === href;
  };

  const isGroupActive = (items: NavItem[]) => {
    return items.some(item => isActive(item.href));
  };

  return (
    <div className={`bg-background border-r border-border transition-all duration-300 ${
      collapsed ? 'w-16' : 'w-64'
    }`}>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border h-16">
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
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navigation.map((item, index) => {
            // Check if item is a group (has items property)
            if ('items' in item) {
              const group = item as NavGroup;
              const isExpanded = isGroupExpanded(group.name);
              const isActiveGroup = isGroupActive(group.items);

              return (
                <div key={group.name}>
                  {/* Group Header */}
                  <button
                    onClick={() => toggleGroup(group.name)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
                      isActiveGroup
                        ? 'bg-primary/10 text-primary border border-primary/20'
                        : 'text-muted-foreground hover:bg-accent'
                    } ${collapsed ? 'justify-center' : ''}`}
                  >
                    <div className={`flex items-center ${collapsed ? '' : 'space-x-3'}`}>
                      <span className="text-lg">{group.icon}</span>
                      {!collapsed && (
                        <span className="font-medium">{group.name}</span>
                      )}
                    </div>
                    {!collapsed && (
                      <span className={`transition-transform duration-200 ${
                        isExpanded ? 'rotate-180' : ''
                      }`}>
                        ▼
                      </span>
                    )}
                  </button>

                  {/* Group Items */}
                  {(!collapsed && isExpanded) && (
                    <div className="ml-6 mt-2 space-y-1">
                      {group.items.map((subItem) => {
                        const isActiveSubItem = isActive(subItem.href);
                        return (
                          <Link
                            key={subItem.name}
                            href={subItem.href}
                            onClick={handleNavigation}
                            className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                              isActiveSubItem
                                ? 'bg-primary text-primary-foreground'
                                : 'text-muted-foreground hover:bg-accent'
                            }`}
                          >
                            <span className="text-sm">{subItem.icon}</span>
                            <span className="font-medium text-sm">{subItem.name}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            } else {
              // Regular navigation item
              const navItem = item as NavItem;
              const isActiveItem = isActive(navItem.href);
              
              return (
                <Link
                  key={navItem.name}
                  href={navItem.href}
                  onClick={handleNavigation}
                  className={`flex items-center px-3 py-2 rounded-lg transition-colors ${
                    isActiveItem
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent'
                  } ${collapsed ? 'justify-center' : 'space-x-3'}`}
                >
                  <span className="text-lg">{navItem.icon}</span>
                  {!collapsed && (
                    <span className="font-medium">{navItem.name}</span>
                  )}
                </Link>
              );
            }
          })}
        </nav>


      </div>
    </div>
  );
} 