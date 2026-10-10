import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  CalendarDays,
  Dumbbell,
  Utensils,
  TrendingUp,
  Bot,
  Settings,
  LogOut,
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';

interface SidebarProps {
  className?: string;
  onItemClick?: () => void;
}

const NAV_ITEMS = [
  { path: '/today', label: 'Today', icon: CalendarDays },
  { path: '/workouts', label: 'Workouts', icon: Dumbbell },
  { path: '/nutrition', label: 'Nutrition', icon: Utensils },
  { path: '/progress', label: 'Progress', icon: TrendingUp },
  { path: '/coach', label: 'Coach', icon: Bot },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export const Sidebar: React.FC<SidebarProps> = ({ className = '', onItemClick }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const displayName = user?.full_name || 'FitMind User';

  return (
    <aside
      className={`w-[240px] flex-shrink-0 bg-surface border-r border-border flex flex-col justify-between p-4 ${className}`}
    >
      <div>
        {/* Brand Header */}
        <div className="mb-6 px-3 py-2">
          <NavLink
            to="/today"
            className="flex items-center gap-2 font-semibold text-lg tracking-tight text-text hover:text-accent transition-colors"
            onClick={onItemClick}
          >
            <span>FitMind</span>
            <span className="text-accent">AI</span>
          </NavLink>
          <span className="text-xs text-text-3 block mt-0.5">
            Personal fitness coach
          </span>
        </div>

        {/* Navigation Items */}
        <nav aria-label="Main Navigation" className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onItemClick}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-accent text-accent-contrast font-semibold shadow-sm'
                      : 'text-text-2 hover:text-text hover:bg-surface-2'
                  }`
                }
              >
                <Icon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* User Info & Quick Logout */}
      <div className="pt-4 border-t border-border flex flex-col gap-3">
        <div className="px-3 flex flex-col">
          <span className="text-sm font-medium text-text truncate">
            {displayName}
          </span>
          {user?.email && (
            <span className="text-xs text-text-3 truncate mt-0.5">{user.email}</span>
          )}
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-text-3 hover:text-danger hover:bg-danger-soft transition-colors w-full text-left"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          <span>Log out</span>
        </button>
      </div>
    </aside>
  );
};
