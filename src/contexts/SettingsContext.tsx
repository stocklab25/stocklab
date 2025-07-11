'use client';

import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';

interface Settings {
  lowStockThreshold: number;
  autoGenerateSku: boolean;
  notifications: {
    lowStock: boolean;
    newItems: boolean;
    transactions: boolean;
    reports: boolean;
  };
  display: {
    theme: 'light' | 'dark';
    dateFormat: string;
    timezone: string;
  };
}

interface SettingsContextType {
  settings: Settings;
  updateSettings: (newSettings: Partial<Settings>) => void;
  updateLowStockThreshold: (threshold: number) => void;
  updateNotificationSettings: (notifications: Partial<Settings['notifications']>) => void;
  updateDisplaySettings: (display: Partial<Settings['display']>) => void;
}

const defaultSettings: Settings = {
  lowStockThreshold: 5,
  autoGenerateSku: true,
  notifications: {
    lowStock: true,
    newItems: true,
    transactions: false,
    reports: true,
  },
  display: {
    theme: 'light',
    dateFormat: 'MM/DD/YYYY',
    timezone: 'UTC',
  },
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const isInitialized = useRef(false);

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('stockLabSettings');
    if (savedSettings) {
      try {
        const parsedSettings = JSON.parse(savedSettings);
        setSettings({ ...defaultSettings, ...parsedSettings });
      } catch (error) {
        console.error('Error parsing saved settings:', error);
      }
    }
    isInitialized.current = true;
  }, []);

  // Save settings to localStorage whenever they change (but not on initial load)
  useEffect(() => {
    if (isInitialized.current) {
      localStorage.setItem('stockLabSettings', JSON.stringify(settings));
    }
  }, [settings]);

  const updateSettings = React.useCallback((newSettings: Partial<Settings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  }, []);

  const updateLowStockThreshold = React.useCallback((threshold: number) => {
    setSettings(prev => ({ ...prev, lowStockThreshold: threshold }));
  }, []);

  const updateNotificationSettings = React.useCallback((notifications: Partial<Settings['notifications']>) => {
    setSettings(prev => ({ 
      ...prev, 
      notifications: { ...prev.notifications, ...notifications } 
    }));
  }, []);

  const updateDisplaySettings = React.useCallback((display: Partial<Settings['display']>) => {
    setSettings(prev => ({ 
      ...prev, 
      display: { ...prev.display, ...display } 
    }));
  }, []);

  const contextValue = React.useMemo(() => ({
    settings,
    updateSettings,
    updateLowStockThreshold,
    updateNotificationSettings,
    updateDisplaySettings,
  }), [settings, updateSettings, updateLowStockThreshold, updateNotificationSettings, updateDisplaySettings]);

  return (
    <SettingsContext.Provider value={contextValue}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
} 