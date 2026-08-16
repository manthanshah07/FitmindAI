import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading, isInitialized, initializeSession } = useAuthStore();

  useEffect(() => {
    if (!isInitialized) {
      initializeSession();
    }
  }, [isInitialized, initializeSession]);

  if (!isInitialized || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bone text-graphite p-8">
        <div className="text-center border border-borderLine p-12">
          <span className="text-[10px] font-mono text-olive uppercase tracking-widest block mb-2">
            FitMind AI Security Guard
          </span>
          <h3 className="text-xl font-bold tracking-tighter uppercase font-mono animate-pulse">
            Initializing Session...
          </h3>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};
