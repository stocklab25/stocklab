import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { NavigationProvider } from '@/contexts/NavigationContext';
import SWRProvider from '@/components/SWRProvider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Stock Lab - Inventory Management System',
  description: 'Professional inventory management system for tracking products, stock, and transactions.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <SWRProvider>
          <ThemeProvider>
            <AuthProvider>
              <NavigationProvider>
                {children}
              </NavigationProvider>
            </AuthProvider>
          </ThemeProvider>
        </SWRProvider>
      </body>
    </html>
  );
}
