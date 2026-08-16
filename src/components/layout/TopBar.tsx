import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

interface TopBarProps {
  onMenuToggle?: () => void;
}

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/coach': 'AI Coach',
  '/workout': 'Workout Overview',
  '/nutrition': 'Nutrition Overview',
  '/progress': 'Progress Tracking',
  '/reports': 'Reports Archive',
  '/profile': 'Profile & Settings',
};

export const TopBar: React.FC<TopBarProps> = ({ onMenuToggle }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const title = PAGE_TITLES[location.pathname] || 'FitMind AI App';

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <header className="h-16 bg-bone border-b border-borderLine px-4 md:px-8 flex items-center justify-between sticky top-0 z-20">
      {/* Left: Mobile Menu Toggle & Title */}
      <div className="flex items-center gap-4">
        {onMenuToggle && (
          <button
            type="button"
            onClick={onMenuToggle}
            aria-label="Toggle Mobile Navigation"
            className="md:hidden p-2 text-graphite border border-borderLine hover:bg-black/5"
          >
            ☰
          </button>
        )}
        <h1 className="font-sans text-lg md:text-xl font-bold tracking-tighter uppercase text-graphite">
          {title}
        </h1>
      </div>

      {/* Right: Badge & Profile / Logout */}
      <div className="flex items-center gap-3">
        <Badge variant="olive" className="hidden sm:inline-block">
          Phase 2 Core App
        </Badge>
        <span className="font-mono text-xs text-graphite font-bold hidden md:inline-block">
          {user?.full_name || user?.email}
        </span>
        <Button variant="secondary" className="text-[10px] py-1.5 px-3" onClick={handleLogout}>
          Log Out
        </Button>
      </div>
    </header>
  );
};
