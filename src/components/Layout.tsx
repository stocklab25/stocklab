'use client';

import Sidebar from './Sidebar';
import Header from './Header';
import { useNavigation } from '@/contexts/NavigationContext';
import { NavigationLoader } from './Loader';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { isNavigating } = useNavigation();

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <Sidebar />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <Header />
        
        {/* Page Content */}
        <main className="flex-1 overflow-auto p-6">
          {isNavigating ? <NavigationLoader /> : children}
        </main>
      </div>
    </div>
  );
} 
