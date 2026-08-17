import React from 'react';
import { NavLink } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-4">
      <Card className="max-w-md w-full p-8 text-center flex flex-col items-center gap-4">
        <span className="font-mono text-xs text-olive uppercase tracking-widest font-bold">
          404 — Page Not Found
        </span>
        <h1 className="text-3xl font-bold uppercase tracking-tighter font-mono text-graphite">
          Route Unreachable
        </h1>
        <p className="text-sm text-charcoal font-sans">
          The requested page URL does not exist or has been moved.
        </p>
        <NavLink to="/dashboard" className="w-full mt-2">
          <Button variant="primary" className="w-full">
            Return to Dashboard →
          </Button>
        </NavLink>
      </Card>
    </div>
  );
};
