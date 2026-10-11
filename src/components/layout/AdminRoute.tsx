import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';

interface AdminRouteProps {
  children: React.ReactNode;
}

export const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const { user, isAuthenticated, isLoading, isInitialized, initializeSession } = useAuthStore();

  useEffect(() => {
    if (!isInitialized) {
      initializeSession();
    }
  }, [isInitialized, initializeSession]);

  if (!isInitialized || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg text-text p-8">
        <div className="text-center border border-border rounded-xl bg-surface p-10">
          <span className="text-xs font-mono text-accent uppercase tracking-widest block mb-2">
            FitMind AI Platform Admin Guard
          </span>
          <h3 className="text-base font-semibold tracking-tight animate-pulse">
            Verifying Administrative Access...
          </h3>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!user?.is_admin) {
    return <Navigate to="/today" replace />;
  }

  return <>{children}</>;
};
