import React from 'react';
import { NavLink } from 'react-router-dom';
import { CalendarDays, Dumbbell, Utensils, TrendingUp, Bot } from 'lucide-react';

export interface TabItem {
  path: string;
  label: string;
  icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>;
}

export const TABS: TabItem[] = [
  { path: '/today', label: 'Today', icon: CalendarDays },
  { path: '/workouts', label: 'Workouts', icon: Dumbbell },
  { path: '/nutrition', label: 'Nutrition', icon: Utensils },
  { path: '/progress', label: 'Progress', icon: TrendingUp },
  { path: '/coach', label: 'Coach', icon: Bot },
];

export const BottomTabs: React.FC = () => {
  return (
    <nav
      aria-label="Bottom Navigation"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-surface/95 backdrop-blur-md border-t border-border pb-[env(safe-area-inset-bottom)]"
    >
      <div className="flex items-center justify-around h-16 max-w-md mx-auto px-2">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <NavLink
              key={tab.path}
              to={tab.path}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center flex-1 h-full py-1 text-xs font-medium transition-colors ${
                  isActive
                    ? 'text-accent font-semibold'
                    : 'text-text-3 hover:text-text'
                }`
              }
            >
              <Icon className="h-5 w-5 mb-1" aria-hidden="true" />
              <span>{tab.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};
