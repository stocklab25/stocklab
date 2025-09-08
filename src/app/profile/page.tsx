'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

export default function EditProfile() {
  const [formData, setFormData] = useState({
    name: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const router = useRouter();
  const { user, getAuthToken, refreshUser } = useAuth();

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
      });
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const token = await getAuthToken();
      if (!token) {
        setError('Authentication required. Please log in again.');
        return;
      }

      const response = await fetch('/api/auth/update-profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Profile updated successfully!');
        // Refresh the auth context to get updated user data
        await refreshUser();
        // Update form with the new name from the response
        setFormData({ name: data.user.name });
      } else {
        setError(data.error || 'Failed to update profile');
      }
    } catch (err) {
      setError('An error occurred while updating your profile');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  // Show loading state while auth is being checked
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-[#18181b] to-[#232325] p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-white mb-4">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-[#18181b] to-[#232325] p-4 dark:from-black dark:via-[#18181b] dark:to-[#232325]">
      <div className="w-full sm:w-[400px] md:w-[420px] lg:w-[480px] rounded-2xl shadow-2xl bg-background dark:bg-[#18181b] border border-border dark:border-white/10 p-8 space-y-8 flex flex-col items-center justify-center">
        {/* Logo and Title */}
        <div className="text-center">
          <div className="mx-auto">
            <img 
              src="/SL-logo.png" 
              alt="Stock Lab Logo" 
              className="h-24 w-auto mx-auto"
            />
          </div>
          <h2 className="text-3xl font-bold text-foreground dark:text-primary-foreground">Edit Profile</h2>
          <p className="mt-2 text-muted-foreground dark:text-muted-foreground">Update your profile information</p>
        </div>

        {/* Profile Form */}
        <form className="w-full space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}
          
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
              {success}
            </div>
          )}

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-foreground dark:text-primary-foreground mb-2">
              Display Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              required
              value={formData.name}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-border dark:border-white/10 bg-muted dark:bg-black/40 text-foreground dark:text-primary-foreground rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-colors placeholder:text-muted-foreground dark:placeholder:text-muted-foreground"
              placeholder="Enter your display name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground dark:text-primary-foreground mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={user?.email || ''}
              disabled
              className="w-full px-4 py-3 border border-border dark:border-white/10 bg-muted/50 dark:bg-black/20 text-muted-foreground dark:text-muted-foreground rounded-lg cursor-not-allowed"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Email address cannot be changed
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-primary-foreground py-3 px-4 rounded-lg hover:bg-primary/90 focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Updating...' : 'Update Profile'}
          </button>
        </form>

        {/* Footer */}
        <div className="text-center space-y-4">
          <Link 
            href="/dashboard" 
            className="text-primary hover:text-primary/80 text-sm block"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
} 