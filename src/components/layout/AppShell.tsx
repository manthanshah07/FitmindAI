import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { BottomNav } from './BottomNav';

interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-bone text-graphite flex flex-col md:flex-row">
      {/* Desktop Sidebar (Fixed left) */}
      <Sidebar className="hidden md:flex min-h-screen sticky top-0" />

      {/* Mobile Drawer (Slide over when open) */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <Sidebar
            className="relative z-10 w-4/5 max-w-xs min-h-full"
            onItemClick={() => setIsMobileMenuOpen(false)}
          />
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-16 md:pb-0">
        <TopBar onMenuToggle={() => setIsMobileMenuOpen((prev) => !prev)} />
        <main className="flex-1 p-4 md:p-8 overflow-y-auto max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <BottomNav />
    </div>
  );
};
