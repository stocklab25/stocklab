'use client';
import { Inter } from 'next/font/google';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';

const inter = Inter({ subsets: ['latin'] });

function ThemedHtml({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;
  return (
    <html lang="en" className={theme === 'dark' ? `dark ${inter.className}` : inter.className}>
      <body>{children}</body>
    </html>
  );
}

export default function ClientRoot({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <ThemedHtml>
        <AuthProvider>
          {children}
        </AuthProvider>
      </ThemedHtml>
    </ThemeProvider>
  );
} 