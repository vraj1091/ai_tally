import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '40px',
          maxWidth: '800px',
          margin: '40px auto',
          background: '#fee',
          border: '2px solid #fcc',
          borderRadius: '8px'
        }}>
          <h1 style={{ color: '#c00', marginBottom: '20px' }}>⚠️ Something went wrong</h1>
          <div style={{ 
            background: 'white', 
            padding: '20px', 
            borderRadius: '4px',
            marginBottom: '20px',
            fontFamily: 'monospace',
            fontSize: '14px',
            overflow: 'auto'
          }}>
            <strong>Error:</strong>
            <pre>{this.state.error && this.state.error.toString()}</pre>
            <br/>
            <strong>Stack:</strong>
            <pre>{this.state.errorInfo && this.state.errorInfo.componentStack}</pre>
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 20px',
              background: '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

