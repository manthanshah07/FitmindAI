import React from 'react';
import { NavLink } from 'react-router-dom';

const MOBILE_NAV_ITEMS = [
  { path: '/dashboard', label: 'Dash', icon: '📊' },
  { path: '/coach', label: 'Coach', icon: '🤖' },
  { path: '/workout', label: 'Workout', icon: '🏋️' },
  { path: '/nutrition', label: 'Nutrition', icon: '🥗' },
  { path: '/profile', label: 'Profile', icon: '👤' },
];

export const BottomNav: React.FC = () => {
  return (
    <nav
      aria-label="Mobile Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-bone border-t border-borderLine flex items-center justify-around z-30"
    >
      {MOBILE_NAV_ITEMS.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center w-full h-full font-mono text-[10px] uppercase tracking-wider transition-colors ${
              isActive ? 'text-graphite font-bold bg-black/5 border-t-2 border-olive' : 'text-faded hover:text-graphite'
            }`
          }
        >
          <span className="text-base">{item.icon}</span>
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
};
