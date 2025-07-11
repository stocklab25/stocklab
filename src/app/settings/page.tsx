'use client';

import { useState } from 'react';
import Layout from '@/components/Layout';
import { Card } from '@/components/Card';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useSettings } from '@/contexts/SettingsContext';
import { useUsers } from '@/hooks';
import WipeDataModal from '@/components/WipeDataModal';
import AddUserModal from '@/components/AddUserModal';
import EditUserModal from '@/components/EditUserModal';

export default function Settings() {
  const { user } = useAuth();
  const { currency, setCurrency } = useCurrency();
  const { settings, updateLowStockThreshold, updateNotificationSettings, updateDisplaySettings } = useSettings();
  const { users, isLoading: usersLoading, mutate: refreshUsers } = useUsers();
  const [showWipeDataModal, setShowWipeDataModal] = useState(false);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);

  const isAdmin = user?.role === 'ADMIN';

  const handleWipeDataSuccess = () => {
    // You could add a toast notification here
    
  };

  const handleAddUserSuccess = () => {
    // Refresh the users list
    refreshUsers();
    
  };

  const handleEditUser = (user: any) => {
    setSelectedUser(user);
    setShowEditUserModal(true);
  };

  const handleEditUserSuccess = () => {
    // Refresh the users list
    refreshUsers();
    
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground mt-2">Configure your Stock Lab system preferences</p>
        </div>

        {/* Profile Settings */}
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Profile Settings</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Display Name
                </label>
                <input
                  type="text"
                  value={user?.name || ''}
                  disabled
                  className="w-full px-3 py-2 border border-input rounded-lg bg-muted/50 cursor-not-allowed"
                />
                <p className="text-sm text-muted-foreground mt-1">Current display name: {user?.name || 'Not set'}</p>
                <a 
                  href="/profile" 
                  className="inline-block mt-2 text-sm text-primary hover:text-primary/80"
                >
                  Edit Profile →
                </a>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="w-full px-3 py-2 border border-input rounded-lg bg-muted/50 cursor-not-allowed"
                />
                <p className="text-sm text-muted-foreground mt-1">Email address cannot be changed</p>
              </div>
            </div>
          </div>
        </Card>

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
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="JPY">JPY (¥)</option>
                  <option value="CAD">CAD (C$)</option>
                  <option value="AUD">AUD (A$)</option>
                  <option value="PHP">PHP (₱)</option>
                  <option value="SGD">SGD (S$)</option>
                  <option value="HKD">HKD (HK$)</option>
                  <option value="KRW">KRW (₩)</option>
                  <option value="CNY">CNY (¥)</option>
                  <option value="INR">INR (₹)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Date Format
                </label>
                <select 
                  value={settings.display.dateFormat}
                  onChange={(e) => updateDisplaySettings({ dateFormat: e.target.value })}
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
                  value={settings.display.timezone}
                  onChange={(e) => updateDisplaySettings({ timezone: e.target.value })}
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
                    checked={settings.notifications.lowStock}
                    onChange={(e) => updateNotificationSettings({ lowStock: e.target.checked })}
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
                    checked={settings.notifications.newItems}
                    onChange={(e) => updateNotificationSettings({ newItems: e.target.checked })}
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
                    checked={settings.notifications.transactions}
                    onChange={(e) => updateNotificationSettings({ transactions: e.target.checked })}
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
                    checked={settings.notifications.reports}
                    onChange={(e) => updateNotificationSettings({ reports: e.target.checked })}
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
                  value={settings.lowStockThreshold}
                  onChange={(e) => updateLowStockThreshold(parseInt(e.target.value) || 1)}
                  min="1"
                  className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
                <p className="text-sm text-muted-foreground mt-1">Minimum quantity before low stock alert</p>
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

        {/* User Management - Admin Only */}
        {isAdmin && (
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">User Management</h3>
              
              {usersLoading ? (
                <div className="text-center py-8">
                  <div className="text-muted-foreground">Loading users...</div>
                </div>
              ) : (
            <div className="space-y-4">
                  {/* Users List */}
                  <div className="space-y-3">
                    {users.map((userItem) => (
                      <div key={userItem.id} className="flex items-center justify-between p-4 bg-accent rounded-lg">
                <div>
                          <p className="font-medium text-foreground">{userItem.name}</p>
                          <p className="text-sm text-muted-foreground">{userItem.email}</p>
                </div>
                <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            userItem.role === 'ADMIN' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {userItem.role === 'ADMIN' ? 'Administrator' : 'User'}
                  </span>
                          <button 
                            onClick={() => handleEditUser(userItem)}
                            className="text-sm text-muted-foreground hover:text-foreground"
                          >
                    Edit
                  </button>
                </div>
                      </div>
                    ))}
              </div>

                  {/* Add User Button */}
                  <button 
                    onClick={() => setShowAddUserModal(true)}
                    className="w-full px-4 py-2 border border-input rounded-lg text-muted-foreground hover:bg-accent transition-colors"
                  >
                + Add New User
              </button>
            </div>
              )}
          </div>
        </Card>
        )}

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

      {/* Add User Modal */}
      <AddUserModal
        isOpen={showAddUserModal}
        onClose={() => setShowAddUserModal(false)}
        onSuccess={handleAddUserSuccess}
      />

      {/* Edit User Modal */}
      <EditUserModal
        isOpen={showEditUserModal}
        onClose={() => setShowEditUserModal(false)}
        onSuccess={handleEditUserSuccess}
        user={selectedUser}
      />
    </Layout>
  );
} 
