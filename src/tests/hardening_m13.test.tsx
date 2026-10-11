import React, { useState } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ErrorBoundary } from '../components/ui/ErrorBoundary';
import { NotFoundPage } from '../pages/NotFoundPage';
import tailwindConfigRaw from '../../tailwind.config.js?raw';

const Thrower: React.FC<{ shouldThrow: boolean }> = ({ shouldThrow }) => {
  if (shouldThrow) {
    throw new Error('Test render explosion');
  }
  return <div>Recovered view content</div>;
};

const RecoverableApp: React.FC = () => {
  const [shouldThrow, setShouldThrow] = useState(true);
  return (
    <div>
      <button type="button" onClick={() => setShouldThrow(false)}>
        Fix underlying state
      </button>
      <ErrorBoundary>
        <Thrower shouldThrow={shouldThrow} />
      </ErrorBoundary>
    </div>
  );
};

describe('Milestone M13 Hardening & Release QA', () => {
  it('ErrorBoundary catches render errors and recovers when Try again is clicked', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(<RecoverableApp />);

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();
    expect(screen.getByText(/Test render explosion/i)).toBeInTheDocument();

    // Fix the state before clicking Try again
    fireEvent.click(screen.getByText('Fix underlying state'));
    fireEvent.click(screen.getByRole('button', { name: /Try again/i }));

    expect(screen.getByText('Recovered view content')).toBeInTheDocument();
    consoleSpy.mockRestore();
  });

  it('NotFoundPage renders friendly sentence-case 404 screen with link to /today', () => {
    render(
      <MemoryRouter>
        <NotFoundPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('404 · Page not found')).toBeInTheDocument();
    expect(screen.getByText('We could not find that page')).toBeInTheDocument();
    const backBtn = screen.getByRole('button', { name: /Go to Today/i });
    expect(backBtn).toBeInTheDocument();
    const link = backBtn.closest('a');
    expect(link).toHaveAttribute('href', '/today');
  });

  it('tailwind.config.js contains zero legacy-* color keys', () => {
    expect(tailwindConfigRaw).not.toMatch(/legacy-(bone|graphite|charcoal|olive|accent|faded|border)/);
  });
});
