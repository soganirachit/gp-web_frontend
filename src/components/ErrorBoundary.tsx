import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      const msg = this.state.error?.message || '';
      const isChunk =
        msg.includes('Failed to fetch dynamically imported module') ||
        msg.includes('Loading chunk') ||
        msg.includes('Importing a module script failed');
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#f8f6f1] px-4">
          <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100 max-w-md w-full text-center">
            <h1 className="text-lg font-semibold text-gray-900 mb-2">
              {isChunk ? 'Update required' : 'Something went wrong'}
            </h1>
            <p className="text-sm text-gray-600 mb-4">
              {isChunk
                ? 'We could not load the latest page files. Refresh to get the newest version.'
                : msg || 'An unexpected error occurred.'}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="w-full rounded-xl bg-[#19411F] text-white px-4 py-3 text-sm font-semibold hover:opacity-95"
            >
              Refresh page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary; 