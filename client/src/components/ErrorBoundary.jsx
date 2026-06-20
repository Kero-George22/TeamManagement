import React, { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Application Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--bg)' }}>
          <div className="card" style={{ padding: '24px 32px', textAlign: 'center', maxWidth: '400px' }}>
            <h3 style={{ marginBottom: 8 }}>Something went wrong</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: 16 }}>{this.state.error?.message || 'An unexpected error occurred.'}</p>
            <button className="btn btn--green" onClick={() => { window.location.href = '/'; }}>
              Reload Application
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
