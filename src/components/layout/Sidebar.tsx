import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { Button } from '../ui/Button';

interface SidebarProps {
  className?: string;
  onItemClick?: () => void;
}

const NAV_ITEMS = [
  { path: '/dashboard', label: 'Dashboard', icon: '📊' },
  { path: '/coach', label: 'AI Coach', icon: '🤖' },
  { path: '/workout', label: 'Workouts', icon: '🏋️' },
  { path: '/nutrition', label: 'Nutrition', icon: '🥗' },
  { path: '/progress', label: 'Progress', icon: '📈' },
  { path: '/reports', label: 'Reports', icon: '📑' },
  { path: '/profile', label: 'Profile', icon: '👤' },
];

export const Sidebar: React.FC<SidebarProps> = ({ className = '', onItemClick }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <aside
      className={`w-64 bg-bone border-r border-borderLine flex flex-col justify-between p-6 ${className}`}
    >
      {/* Brand Logo & Header */}
      <div>
        <div className="mb-8 pb-6 border-b border-borderLine">
          <NavLink to="/dashboard" className="flex items-center gap-2" onClick={onItemClick}>
            <span className="font-mono text-xl font-bold tracking-tighter uppercase text-graphite">
              FitMind <span className="text-olive">AI</span>
            </span>
          </NavLink>
          <span className="font-mono text-[9px] uppercase tracking-widest text-faded block mt-1">
            Personal Fitness Coach
          </span>
        </div>

        {/* Navigation Items */}
        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onItemClick}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 font-mono text-xs uppercase tracking-wider transition-colors border ${
                  isActive
                    ? 'bg-graphite text-bone border-graphite font-bold'
                    : 'text-graphite border-transparent hover:border-borderLine hover:bg-black/5'
                }`
              }
            >
              <span className="text-base">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      {/* User Info Footer & Logout */}
      <div className="pt-6 border-t border-borderLine flex flex-col gap-4">
        <div className="flex flex-col">
          <span className="font-sans text-sm font-bold text-graphite truncate">
            {user?.full_name || 'FitMind User'}
          </span>
          <span className="font-mono text-[10px] text-faded truncate">{user?.email}</span>
        </div>

        <Button variant="secondary" className="w-full text-xs py-2.5" onClick={handleLogout}>
          Log Out
        </Button>
      </div>
    </aside>
  );
};
