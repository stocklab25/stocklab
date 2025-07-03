'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  email: string;
  name: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check if user is logged in on app start
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    const userEmail = localStorage.getItem('userEmail');
    
    if (isLoggedIn === 'true' && userEmail) {
      setUser({
        email: userEmail,
        name: 'Admin User',
        role: 'Administrator',
      });
    }
    
    setLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      // Simulate API call
      if (email && password) {
        const userData = {
          email,
          name: 'Admin User',
          role: 'Administrator',
        };
        
        setUser(userData);
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('userEmail', email);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('userEmail');
    router.push('/login');
  };

  const value = {
    user,
    isAuthenticated: !!user,
    login,
    logout,
    loading,
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