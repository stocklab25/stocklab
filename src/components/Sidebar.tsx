'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useNavigation } from '@/contexts/NavigationContext';
import {
  DashboardIcon,
  ProductsIcon,
  TransactionsIcon,
  InventoryIcon,
  StoreInventoryIcon,
  StoreSalesIcon,
  AccountingIcon,
  PurchaseOrdersIcon,
  ExpensesIcon,
  CardsIcon,
  ReportsIcon,
  ProfileIcon,
  SettingsIcon
} from '@/utils/icons';

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
  { name: 'Dashboard', href: '/', icon: 'dashboard' },
  { name: 'Purchase Orders', href: '/purchase-orders', icon: 'purchase-orders' },
  { name: 'Products', href: '/products', icon: 'products' },
  { name: 'Transactions', href: '/transactions', icon: 'transactions' },
  { name: 'Inventory', href: '/inventory', icon: 'inventory' },
  {
    name: 'Store',
    icon: 'store-inventory',
    items: [
      { name: 'Store Inventory', href: '/store-inventory', icon: 'store-inventory' },
      { name: 'Stores', href: '/stores', icon: 'store-inventory' },
      { name: 'Store Sales', href: '/store-sales', icon: 'store-sales' },
    ]
  },
  {
    name: 'Accounting',
    icon: 'accounting',
    items: [
      { name: 'Accounts', href: '/accounting', icon: 'accounting' },
      { name: 'Expenses', href: '/expenses', icon: 'expenses' },
      { name: 'Cards', href: '/cards', icon: 'cards' },
    ]
  },
  { name: 'Reports', href: '/reports', icon: 'reports' },
  { name: 'Profile', href: '/profile', icon: 'profile' },
  { name: 'Settings', href: '/settings', icon: 'settings' },
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

  const renderIcon = (iconName: string) => {
    switch (iconName) {
      case 'dashboard':
        return <DashboardIcon />;
      case 'products':
        return <ProductsIcon />;
      case 'transactions':
        return <TransactionsIcon />;
      case 'inventory':
        return <InventoryIcon />;
      case 'store-inventory':
        return <StoreInventoryIcon />;
      case 'store-sales':
        return <StoreSalesIcon />;
      case 'accounting':
        return <AccountingIcon />;
      case 'purchase-orders':
        return <PurchaseOrdersIcon />;
      case 'expenses':
        return <ExpensesIcon />;
      case 'cards':
        return <CardsIcon />;
      case 'reports':
        return <ReportsIcon />;
      case 'profile':
        return <ProfileIcon />;
      case 'settings':
        return <SettingsIcon />;
      default:
        return null;
    }
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
              <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center">
                <img 
                  src="/SL-logo.png" 
                  alt="Stock Lab Logo" 
                  className="w-6 h-6 object-contain"
                />
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
                      <span className="text-lg">{renderIcon(group.icon)}</span>
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
                            <span className="text-sm">{renderIcon(subItem.icon)}</span>
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
                  <span className="text-lg">{renderIcon(navItem.icon)}</span>
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
