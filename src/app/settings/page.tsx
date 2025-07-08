'use client';

import { useState } from 'react';
import Layout from '@/components/Layout';
import { Card } from '@/components/Card';
import { useAuth } from '@/contexts/AuthContext';
import WipeDataModal from '@/components/WipeDataModal';

export default function Settings() {
  const { user } = useAuth();
  const [showWipeDataModal, setShowWipeDataModal] = useState(false);
  const [notifications, setNotifications] = useState({
    lowStock: true,
    newItems: true,
    transactions: false,
    reports: true,
  });

  const [displaySettings, setDisplaySettings] = useState({
    theme: 'light',
    currency: 'USD',
    dateFormat: 'MM/DD/YYYY',
    timezone: 'UTC',
  });

  const isAdmin = user?.role === 'ADMIN';

  const handleWipeDataSuccess = () => {
    // You could add a toast notification here
    console.log('Data wiped successfully');
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground mt-2">Configure your Stock Lab system preferences</p>
        </div>

        {/* General Settings */}
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">General Settings</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Company Name
                </label>
                <input
                  type="text"
                  defaultValue="Stock Lab"
                  className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Default Currency
                </label>
                <select 
                  value={displaySettings.currency}
                  onChange={(e) => setDisplaySettings({...displaySettings, currency: e.target.value})}
                  className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="JPY">JPY (¥)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Date Format
                </label>
                <select 
                  value={displaySettings.dateFormat}
                  onChange={(e) => setDisplaySettings({...displaySettings, dateFormat: e.target.value})}
                  className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                  <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Timezone
                </label>
                <select 
                  value={displaySettings.timezone}
                  onChange={(e) => setDisplaySettings({...displaySettings, timezone: e.target.value})}
                  className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="UTC">UTC</option>
                  <option value="America/New_York">Eastern Time</option>
                  <option value="America/Chicago">Central Time</option>
                  <option value="America/Denver">Mountain Time</option>
                  <option value="America/Los_Angeles">Pacific Time</option>
                </select>
              </div>
            </div>
          </div>
        </Card>

        {/* Notification Settings */}
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Notification Settings</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">Low Stock Alerts</p>
                  <p className="text-sm text-muted-foreground">Get notified when items are running low</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifications.lowStock}
                    onChange={(e) => setNotifications({...notifications, lowStock: e.target.checked})}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-background after:border-input after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">New Item Notifications</p>
                  <p className="text-sm text-muted-foreground">Get notified when new items are added</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifications.newItems}
                    onChange={(e) => setNotifications({...notifications, newItems: e.target.checked})}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-background after:border-input after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">Transaction Alerts</p>
                  <p className="text-sm text-muted-foreground">Get notified for all stock movements</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifications.transactions}
                    onChange={(e) => setNotifications({...notifications, transactions: e.target.checked})}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-background after:border-input after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">Weekly Reports</p>
                  <p className="text-sm text-muted-foreground">Receive weekly inventory summaries</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifications.reports}
                    onChange={(e) => setNotifications({...notifications, reports: e.target.checked})}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-background after:border-input after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>
            </div>
          </div>
        </Card>

        {/* Inventory Settings */}
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Inventory Settings</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Low Stock Threshold
                </label>
                <input
                  type="number"
                  defaultValue="5"
                  min="1"
                  className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
                <p className="text-sm text-muted-foreground mt-1">Minimum quantity before low stock alert</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Default Location
                </label>
                <input
                  type="text"
                  defaultValue="A1"
                  className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
                <p className="text-sm text-muted-foreground mt-1">Default location for new inventory items</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Auto-generate SKU
                </label>
                <select className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent">
                  <option value="enabled">Enabled</option>
                  <option value="disabled">Disabled</option>
                </select>
                <p className="text-sm text-muted-foreground mt-1">Automatically generate SKU for new items</p>
              </div>
            </div>
          </div>
        </Card>

        {/* User Management */}
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">User Management</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-accent rounded-lg">
                <div>
                  <p className="font-medium text-foreground">Admin User</p>
                  <p className="text-sm text-muted-foreground">admin@stocklab.com</p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                    Administrator
                  </span>
                  <button className="text-sm text-muted-foreground hover:text-foreground">
                    Edit
                  </button>
                </div>
              </div>

              <button className="w-full px-4 py-2 border border-input rounded-lg text-muted-foreground hover:bg-accent transition-colors">
                + Add New User
              </button>
            </div>
          </div>
        </Card>

        {/* Admin Only - Danger Zone */}
        {isAdmin && (
          <Card>
            <div className="p-6 border-l-4 border-red-500">
              <div className="flex items-center mb-4">
                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center mr-3">
                  <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-foreground">Danger Zone</h3>
              </div>
              
              <div className="mb-4">
                <p className="text-sm text-muted-foreground mb-3">
                  These actions are irreversible and will permanently delete data from your system.
                </p>
                <button
                  onClick={() => setShowWipeDataModal(true)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Wipe All Data
                </button>
              </div>
            </div>
          </Card>
        )}

        {/* Save Button */}
        <div className="flex justify-end space-x-3">
          <button className="px-6 py-2 border border-input rounded-lg text-muted-foreground hover:bg-accent transition-colors">
            Cancel
          </button>
          <button className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
            Save Changes
          </button>
        </div>
      </div>

      {/* Wipe Data Modal */}
      <WipeDataModal
        isOpen={showWipeDataModal}
        onClose={() => setShowWipeDataModal(false)}
        onSuccess={handleWipeDataSuccess}
      />
    </Layout>
  );
} 