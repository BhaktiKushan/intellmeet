import React from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[IntellMeet ErrorBoundary caught error]:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          background: 'var(--bg-main, #080c14)',
          color: 'var(--text-main, #f8fafc)',
          fontFamily: 'var(--font-body, system-ui, sans-serif)',
          textAlign: 'center'
        }}>
          <div className="glass-panel" style={{
            background: 'rgba(14, 21, 36, 0.95)',
            padding: '36px 40px',
            borderRadius: '16px',
            border: '1px solid var(--border-subtle)',
            maxWidth: '520px',
            width: '100%'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'rgba(239, 68, 68, 0.15)',
              color: '#ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px'
            }}>
              <AlertCircle size={26} />
            </div>

            <h2 style={{ fontSize: '1.35rem', fontWeight: 700, marginBottom: '8px', color: '#fff' }}>
              Unexpected Display Issue
            </h2>
            <p style={{ color: 'var(--text-muted, #94a3b8)', fontSize: '0.9rem', marginBottom: '24px', lineHeight: 1.5 }}>
              IntellMeet recovered from an unexpected error. Your meetings, recordings, and action items are safe.
            </p>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.reload();
                }}
                className="btn btn-primary"
                style={{ fontSize: '0.88rem', padding: '10px 18px' }}
              >
                <RefreshCw size={15} />
                <span>Reload Page</span>
              </button>

              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  if (this.props.onNavigateHome) {
                    this.props.onNavigateHome();
                  } else {
                    window.location.href = '/';
                  }
                }}
                className="btn btn-secondary"
                style={{ fontSize: '0.88rem', padding: '10px 18px' }}
              >
                <Home size={15} />
                <span>Go to Dashboard</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

