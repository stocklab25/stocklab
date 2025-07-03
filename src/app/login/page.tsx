'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

export default function Login() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const success = await login(formData.email, formData.password);
      if (success) {
        router.push('/dashboard');
      } else {
        setError('Invalid email or password');
      }
    } catch {
      setError('Login failed. Please try again.');
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-[#18181b] to-[#232325] p-4 dark:from-black dark:via-[#18181b] dark:to-[#232325]">
      <div className="w-full sm:w-[400px] md:w-[420px] lg:w-[480px] rounded-2xl shadow-2xl bg-background dark:bg-[#18181b] border border-border dark:border-white/10 p-8 space-y-8 flex flex-col items-center justify-center">
        {/* Logo and Title */}
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-primary rounded-xl flex items-center justify-center mb-4">
            <span className="text-primary-foreground font-bold text-2xl">SL</span>
          </div>
          <h2 className="text-3xl font-bold text-foreground dark:text-primary-foreground">Stock Lab</h2>
          <p className="mt-2 text-muted-foreground dark:text-muted-foreground">Sign in to your account</p>
        </div>
        {/* Login Form */}
        <form className="w-full space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-foreground dark:text-primary-foreground mb-2">
              Email Address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={formData.email}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-border dark:border-white/10 bg-muted dark:bg-black/40 text-foreground dark:text-primary-foreground rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-colors placeholder:text-muted-foreground dark:placeholder:text-muted-foreground"
              placeholder="Enter your email"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-foreground dark:text-primary-foreground mb-2">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={formData.password}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-border dark:border-white/10 bg-muted dark:bg-black/40 text-foreground dark:text-primary-foreground rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-colors placeholder:text-muted-foreground dark:placeholder:text-muted-foreground"
                placeholder="Enter your password"
              />
              {/* Eye icon placeholder for future show/hide password */}
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground cursor-pointer">
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className="h-4 w-4 text-primary focus:ring-primary border-input rounded"
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-foreground dark:text-primary-foreground">
                Remember me
              </label>
            </div>
            <Link href="/forgot-password" className="text-sm text-primary hover:text-primary/80">
              Forgot password?
            </Link>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-primary-foreground py-3 px-4 rounded-lg hover:bg-primary/90 focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        {/* Footer */}
        <div className="text-center">
          <p className="text-muted-foreground dark:text-muted-foreground text-sm">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-primary hover:text-primary/80">
              Contact administrator
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
} 