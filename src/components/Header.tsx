'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useNavigation } from '@/contexts/NavigationContext';
import Loader from './Loader';
import { BellIcon, SunIcon, MoonIcon, ProfileIcon, LogoutIcon } from '@/utils/icons';

export default function Header() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { isNavigating } = useNavigation();

  return (
    <header className="bg-background border-b border-border px-6 py-4 h-16">
      <div className="flex items-center justify-end">
        <div className="flex items-center space-x-4">
          {/* Navigation Loading Indicator */}
          {isNavigating && (
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <Loader size="sm" variant="dots" />
              <span>Loading...</span>
            </div>
          )}

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-accent dark:hover:bg-muted transition-colors"
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? (
              <span className="text-yellow-400"><SunIcon /></span>
            ) : (
              <span className="text-muted-foreground"><MoonIcon /></span>
            )}
          </button>

          {/* User Profile */}
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
              <span className="text-muted-foreground text-sm"><ProfileIcon /></span>
            </div>
            <div className="hidden md:block">
              <p className="text-sm font-medium text-foreground">{user?.name || 'Admin User'}</p>
              <p className="text-xs text-muted-foreground">{user?.role || 'Administrator'}</p>
            </div>
            <button
              onClick={logout}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-muted text-foreground hover:bg-muted-foreground hover:text-background transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
              title="Logout"
            >
              <span className="text-lg"><LogoutIcon /></span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
} 
