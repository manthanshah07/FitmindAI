import React from 'react';
import { useNavigate } from 'react-router-dom';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Settings, LogOut, Sun, Moon, Laptop } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { useTheme } from '../../lib/theme';

export const AvatarMenu: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { theme, setTheme } = useTheme();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const getInitials = (name?: string | null, email?: string | null) => {
    if (name && name.trim()) {
      const parts = name.trim().split(/\s+/);
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
      }
      return name.slice(0, 2).toUpperCase();
    }
    if (email) {
      return email.slice(0, 2).toUpperCase();
    }
    return 'FM';
  };

  const initials = getInitials(user?.full_name, user?.email);
  const displayName = user?.full_name || 'FitMind User';

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label={`User menu for ${displayName}`}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-accent-soft-text hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg transition-opacity"
        >
          {initials}
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-50 min-w-[220px] rounded-xl border border-border bg-surface p-1.5 shadow-float text-sm text-text animate-in fade-in-80"
        >
          {/* User Info Header */}
          <div className="px-3 py-2 border-b border-border mb-1">
            <p className="font-medium text-text truncate">{displayName}</p>
            {user?.email && (
              <p className="text-xs text-text-3 truncate mt-0.5">{user.email}</p>
            )}
          </div>

          {/* Navigation Links */}
          <DropdownMenu.Item
            onSelect={() => navigate('/settings')}
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-text-2 hover:text-text hover:bg-surface-2 cursor-pointer outline-none transition-colors"
          >
            <Settings className="h-4 w-4 text-text-3" aria-hidden="true" />
            <span>Settings</span>
          </DropdownMenu.Item>

          {/* Theme Submenu / Switcher */}
          <div className="px-3 py-2 border-t border-border mt-1 mb-1">
            <p className="text-xs font-medium text-text-3 mb-1.5">Theme</p>
            <div className="grid grid-cols-3 gap-1 bg-surface-2 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setTheme('light')}
                className={`flex items-center justify-center py-1 rounded text-xs transition-colors ${
                  theme === 'light' ? 'bg-surface font-medium text-text shadow-sm' : 'text-text-3 hover:text-text'
                }`}
                title="Light theme"
              >
                <Sun className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={`flex items-center justify-center py-1 rounded text-xs transition-colors ${
                  theme === 'dark' ? 'bg-surface font-medium text-text shadow-sm' : 'text-text-3 hover:text-text'
                }`}
                title="Dark theme"
              >
                <Moon className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setTheme('system')}
                className={`flex items-center justify-center py-1 rounded text-xs transition-colors ${
                  theme === 'system' ? 'bg-surface font-medium text-text shadow-sm' : 'text-text-3 hover:text-text'
                }`}
                title="System theme"
              >
                <Laptop className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Logout */}
          <div className="border-t border-border pt-1">
            <DropdownMenu.Item
              onSelect={handleLogout}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-danger hover:bg-danger-soft cursor-pointer outline-none transition-colors"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              <span>Log out</span>
            </DropdownMenu.Item>
          </div>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
};
