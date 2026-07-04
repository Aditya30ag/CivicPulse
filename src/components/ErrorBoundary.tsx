import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';
import { logger } from '../lib/logger';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    logger.error('Unhandled error caught by ErrorBoundary:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[100dvh] bg-page flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl shadow-lg border border-border-subtle p-8 max-w-md w-full text-center space-y-6">
            <div className="mx-auto w-16 h-16 rounded-full bg-danger/10 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-danger" />
            </div>

            <div className="space-y-2">
              <h1 className="text-xl font-bold text-dark">Something went wrong</h1>
              <p className="text-muted text-sm leading-relaxed">
                An unexpected error occurred. Please try again or return to the home page.
              </p>
              {this.state.error && (
                <details className="text-left mt-4">
                  <summary className="text-xs text-muted cursor-pointer hover:text-dark transition-colors">
                    Error details
                  </summary>
                  <pre className="mt-2 text-xs text-danger bg-danger/5 rounded-lg p-3 overflow-auto max-h-32">
                    {this.state.error.message}
                  </pre>
                </details>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={this.handleReset}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-dark text-white rounded-xl font-medium text-sm hover:opacity-90 transition-opacity cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                Try again
              </button>
              <a
                href="/"
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 border border-border-subtle rounded-xl font-medium text-sm text-dark hover:bg-border-subtle/50 transition-colors"
              >
                <Home className="w-4 h-4" />
                Go home
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
