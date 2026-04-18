import { Component } from 'react';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary] Caught error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      const { dark, fallbackMessage } = this.props;
      return (
        <div className={`min-h-screen flex flex-col items-center justify-center px-4 ${dark ? 'bg-charcoal-950 text-white' : 'bg-gray-50 text-gray-900'}`}>
          <p className="text-4xl mb-4">⚠️</p>
          <h2 className="font-display text-xl font-bold mb-2">
            {fallbackMessage || 'Something went wrong'}
          </h2>
          <p className={`text-sm mb-4 text-center max-w-sm ${dark ? 'text-charcoal-400' : 'text-gray-500'}`}>
            {this.state.error?.message || 'An unexpected error occurred loading this page.'}
          </p>
          <button
            type="button"
            onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }}
            className="px-5 py-2.5 rounded-xl bg-gold-500 hover:bg-gold-600 text-charcoal-900 font-bold text-sm transition-all"
          >
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
