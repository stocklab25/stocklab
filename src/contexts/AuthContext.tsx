'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  loading: boolean;
  getAuthToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Convert Supabase user to our app's user format
  const convertSupabaseUser = (supabaseUser: User | null): AuthUser | null => {
    if (!supabaseUser) return null;
    
    return {
      id: supabaseUser.id,
      email: supabaseUser.email || '',
      name: supabaseUser.user_metadata?.name || 'Unknown User',
      role: supabaseUser.user_metadata?.role || 'USER',
    };
  };

  useEffect(() => {
    // Check if user is logged in on app start
    const checkAuth = async () => {
      try {
        const { session } = await auth.getCurrentSession();
        if (session?.user) {
          setUser(convertSupabaseUser(session.user));
        }
      } catch (error) {
        console.error('Auth check error:', error);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();

    // Listen to auth state changes
    const { data: { subscription } } = auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        
        if (event === 'SIGNED_IN' && session?.user) {
          setUser(convertSupabaseUser(session.user));
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
        }
        
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      console.log('Attempting login with:', { email, password: '***' });
      
      const { data, error } = await auth.signIn(email, password);
      
      console.log('Login response:', { data: data ? 'success' : 'no data', error });
      
      if (error) {
        console.error('Login failed:', error.message);
        console.error('Error details:', error);
        return false;
      }

      if (data?.user) {
        console.log('Login successful, user:', data.user.email);
        const convertedUser = convertSupabaseUser(data.user);
        console.log('Converted user:', convertedUser);
        setUser(convertedUser);
        return true;
      }
      
      console.log('No user data returned from login');
      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const logout = async () => {
    try {
      const { error } = await auth.signOut();
      if (error) {
        console.error('Logout error:', error);
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      router.push('/login');
    }
  };

  const getAuthToken = async (): Promise<string | null> => {
    try {
      // Get the current session from Supabase
      const { session } = await auth.getCurrentSession();
      
      if (session?.access_token) {
        console.log('🔑 Frontend Debug - Token generated (first 20 chars):', session.access_token.substring(0, 20) + '...');
        console.log('🔑 Frontend Debug - Token length:', session.access_token.length);
        return session.access_token;
      } else {
        console.log('❌ Frontend Debug - No session or access token found');
        return null;
      }
    } catch (error) {
      console.error('❌ Frontend Debug - Error getting auth token:', error);
      return null;
    }
  };

  const value = {
    user,
    isAuthenticated: !!user,
    login,
    logout,
    loading,
    getAuthToken,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 