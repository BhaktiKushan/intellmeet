import React from 'react';
import { AlertCircle, RefreshCw, Home, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
      copied: false
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[IntellMeet ErrorBoundary caught error]:', error, errorInfo);
    this.setState({ errorInfo });
    try {
      const errorData = {
        message: error?.message || String(error),
        stack: error?.stack || null,
        componentStack: errorInfo?.componentStack || null,
        timestamp: new Date().toISOString()
      };
      sessionStorage.setItem('intellmeet_last_error', JSON.stringify(errorData));
    } catch (e) {
      // Ignore storage errors
    }
  }

  componentDidUpdate(prevProps) {
    // Auto-recover when route or reset trigger changes
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false, error: null, errorInfo: null });
    }
  }

  handleCopyDetails = () => {
    const { error, errorInfo } = this.state;
    const text = `Error: ${error?.message}\n\nStack: ${error?.stack}\n\nComponent Stack: ${errorInfo?.componentStack}`;
    navigator.clipboard.writeText(text);
    this.setState({ copied: true });
    setTimeout(() => this.setState({ copied: false }), 2000);
  };

  render() {
    if (this.state.hasError) {
      const errorMessage = this.state.error?.message || 'An unexpected rendering error occurred.';
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
            background: 'rgba(14, 21, 36, 0.96)',
            padding: '36px 40px',
            borderRadius: '20px',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            maxWidth: '560px',
            width: '100%',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8)'
          }}>
            <div style={{
              width: '52px',
              height: '52px',
              borderRadius: '14px',
              background: 'rgba(239, 68, 68, 0.15)',
              color: '#ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 18px',
              boxShadow: '0 0 20px rgba(239, 68, 68, 0.25)'
            }}>
              <AlertCircle size={28} />
            </div>

            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '8px', color: '#fff' }}>
              Unexpected Display Issue
            </h2>
            <p style={{ color: 'var(--text-muted, #94a3b8)', fontSize: '0.92rem', marginBottom: '24px', lineHeight: 1.5 }}>
              IntellMeet recovered from an unexpected error. Your meetings, recordings, and action items are safe.
            </p>

            {/* Quick Action Buttons */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'center', marginBottom: '20px' }}>
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null, errorInfo: null });
                }}
                className="btn btn-primary"
                style={{ fontSize: '0.88rem', padding: '10px 18px' }}
              >
                <RefreshCw size={15} />
                <span>Try Again</span>
              </button>

              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null, errorInfo: null });
                  window.location.reload();
                }}
                className="btn btn-secondary"
                style={{ fontSize: '0.88rem', padding: '10px 18px' }}
              >
                <RefreshCw size={15} />
                <span>Reload Page</span>
              </button>

              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null, errorInfo: null });
                  if (this.props.onNavigateHome) {
                    this.props.onNavigateHome();
                  } else {
                    window.location.hash = '#/dashboard';
                    window.location.reload();
                  }
                }}
                className="btn btn-secondary"
                style={{ fontSize: '0.88rem', padding: '10px 18px' }}
              >
                <Home size={15} />
                <span>Go to Dashboard</span>
              </button>
            </div>

            {/* Collapsible Error Details Accordion */}
            <div style={{
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              paddingTop: '16px',
              textAlign: 'left'
            }}>
              <button
                onClick={() => this.setState({ showDetails: !this.state.showDetails })}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-dim, #64748b)',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  padding: '4px 0'
                }}
              >
                <span>Technical Diagnostic Details</span>
                {this.state.showDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>

              {this.state.showDetails && (
                <div style={{
                  marginTop: '10px',
                  background: '#040711',
                  borderRadius: '10px',
                  padding: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  fontSize: '0.75rem',
                  fontFamily: 'monospace',
                  color: '#f87171',
                  maxHeight: '160px',
                  overflowY: 'auto'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ color: '#94a3b8', fontWeight: 600 }}>Error Stack</span>
                    <button
                      onClick={this.handleCopyDetails}
                      style={{
                        background: 'rgba(255, 255, 255, 0.1)',
                        border: 'none',
                        color: '#cbd5e1',
                        borderRadius: '6px',
                        padding: '2px 8px',
                        fontSize: '0.7rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      {this.state.copied ? <Check size={12} color="#34d399" /> : <Copy size={12} />}
                      <span>{this.state.copied ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <div>{errorMessage}</div>
                  {this.state.error?.stack && (
                    <div style={{ color: '#64748b', marginTop: '6px', whiteSpace: 'pre-wrap' }}>
                      {this.state.error.stack.slice(0, 300)}...
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

