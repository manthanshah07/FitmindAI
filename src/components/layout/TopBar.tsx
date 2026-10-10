import React from 'react';
import { useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { AvatarMenu } from './AvatarMenu';

interface TopBarProps {
  onMenuToggle?: () => void;
}

const PAGE_TITLES: Record<string, string> = {
  '/today': 'Today',
  '/dashboard': 'Today',
  '/workouts': 'Workouts',
  '/workout': 'Workouts',
  '/nutrition': 'Nutrition',
  '/progress': 'Progress',
  '/coach': 'AI Coach',
  '/settings': 'Settings',
  '/profile': 'Settings',
  '/reports': 'Reports',
  '/intelligence': 'Forecast',
  '/challenges': 'Challenges',
  '/dev/ui': 'Design System Showcase',
};

export const TopBar: React.FC<TopBarProps> = ({ onMenuToggle }) => {
  const location = useLocation();
  const title = PAGE_TITLES[location.pathname] || 'FitMind AI';

  return (
    <header className="h-16 bg-surface/90 backdrop-blur-md border-b border-border px-4 md:px-8 flex items-center justify-between sticky top-0 z-20">
      {/* Left: Mobile Menu Toggle & Title */}
      <div className="flex items-center gap-3">
        {onMenuToggle && (
          <button
            type="button"
            onClick={onMenuToggle}
            aria-label="Toggle Mobile Navigation"
            className="lg:hidden p-2 rounded-lg text-text-2 hover:text-text hover:bg-surface-2 focus:outline-none focus:ring-2 focus:ring-accent transition-colors"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>
        )}
        <h1 className="text-lg md:text-xl font-semibold tracking-tight text-text">
          {title}
        </h1>
      </div>

      {/* Right: Avatar Menu */}
      <div className="flex items-center gap-3">
        <AvatarMenu />
      </div>
    </header>
  );
};
