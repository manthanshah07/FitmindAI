import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from './Button';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackTitle?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    errorMessage: null,
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error.message || 'An unexpected error occurred.',
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('FitMind ErrorBoundary caught an error:', error, errorInfo);
  }

  private handleReset = (): void => {
    this.setState({ hasError: false, errorMessage: null });
  };

  public render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          className="min-h-[50vh] flex flex-col items-center justify-center p-6 bg-bg text-text font-sans"
        >
          <div className="max-w-md w-full bg-surface border border-border rounded-card p-8 text-center shadow-sm space-y-4">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-danger/10 text-danger font-bold text-lg">
              !
            </div>
            <h2 className="text-xl font-bold text-text tracking-tight">
              {this.props.fallbackTitle || 'Something went wrong'}
            </h2>
            <p className="text-sm text-text-2 leading-relaxed">
              We hit an unexpected issue while rendering this view. Your logged workouts, meals, and progress data are safe.
            </p>
            {this.state.errorMessage && (
              <p className="text-xs font-mono text-text-3 bg-surface-2 border border-border rounded-input p-2.5 break-words">
                {this.state.errorMessage}
              </p>
            )}
            <div className="pt-2 flex items-center justify-center gap-3">
              <Button variant="primary" onClick={this.handleReset}>
                Try again
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
