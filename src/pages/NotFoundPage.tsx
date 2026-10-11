import React from 'react';
import { NavLink } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-4 bg-bg text-text">
      <Card className="max-w-md w-full p-8 text-center flex flex-col items-center gap-4 bg-surface border-border">
        <span className="text-xs font-medium text-accent">
          404 · Page not found
        </span>
        <h1 className="text-2xl font-semibold tracking-tight text-text">
          We could not find that page
        </h1>
        <p className="text-sm text-text-2 font-sans">
          The page address may have changed or is no longer available.
        </p>
        <NavLink to="/today" className="w-full mt-2">
          <Button variant="primary" className="w-full">
            Go to Today
          </Button>
        </NavLink>
      </Card>
    </div>
  );
};
