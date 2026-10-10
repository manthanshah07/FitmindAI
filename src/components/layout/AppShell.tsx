import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { BottomTabs } from './BottomTabs';

interface AppShellProps {
  children?: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen min-h-[100dvh] bg-bg text-text flex flex-col lg:flex-row">
      {/* Desktop Sidebar (Fixed left, >=1024px) */}
      <Sidebar className="hidden lg:flex min-h-screen sticky top-0" />

      {/* Mobile Drawer (Slide over when toggled from topbar) */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex" role="dialog" aria-modal="true">
          <div
            className="fixed inset-0 bg-black/60 transition-opacity backdrop-blur-xs"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <Sidebar
            className="relative z-10 w-4/5 max-w-xs min-h-full shadow-float"
            onItemClick={() => setIsMobileMenuOpen(false)}
          />
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-20 lg:pb-0">
        <TopBar onMenuToggle={() => setIsMobileMenuOpen((prev) => !prev)} />
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto max-w-[1120px] w-full mx-auto">
          {children || <Outlet />}
        </main>
      </div>

      {/* Mobile Bottom Navigation (<1024px) */}
      <BottomTabs />
    </div>
  );
};
