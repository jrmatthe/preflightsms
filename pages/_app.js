import '../styles/globals.css';
import Head from 'next/head';
import React, { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, info) { console.error("[ErrorBoundary]", error, info); Sentry.captureException(error, { extra: { componentStack: info?.componentStack } }); }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#111", color: "#e5e5e5", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
          <div style={{ textAlign: "center", maxWidth: 400, padding: 40 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>Something went wrong</div>
            <p style={{ color: "#888", fontSize: 14, marginBottom: 24 }}>An unexpected error occurred. Your data is safe.</p>
            <button onClick={() => window.location.reload()} style={{ padding: "12px 32px", background: "#22D3EE", color: "#000", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Reload Page</button>
            {this.state.error && <pre style={{ marginTop: 24, padding: 16, background: "#1a1a1a", borderRadius: 8, fontSize: 11, color: "#ef4444", textAlign: "left", overflow: "auto", maxHeight: 120 }}>{this.state.error.message}</pre>}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App({ Component, pageProps }) {
  // Register service worker for offline support
  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('[App] SW registered, scope:', registration.scope);

          // When a new SW is found, log it
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (!newWorker) return;

            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'activated') {
                console.log('[App] New SW activated — refresh for updates');
              }
            });
          });
        })
        .catch((err) => {
          console.warn('[App] SW registration failed:', err);
        });
    }
  }, []);

  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
      </Head>
      <ErrorBoundary>
        <Component {...pageProps} />
      </ErrorBoundary>
    </>
  );
}
