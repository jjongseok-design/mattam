import { createRoot } from "react-dom/client";
import { Component, type ReactNode } from "react";
import * as Sentry from "@sentry/react";
import App from "./App.tsx";
import "./index.css";

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error?: Error }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, info: { componentStack: string }) {
    Sentry.captureException(error, { extra: { componentStack: info.componentStack } });
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:"100vh", gap:16, padding:24, textAlign:"center" }}>
          <div style={{ fontSize:48 }}>😵</div>
          <div style={{ fontWeight:700, fontSize:18 }}>앱 오류가 발생했습니다</div>
          <div style={{ color:"#888", fontSize:14 }}>{this.state.error?.message}</div>
          <button onClick={() => window.location.reload()} style={{ marginTop:8, padding:"10px 24px", borderRadius:8, background:"#f97316", color:"#fff", border:"none", fontWeight:700, cursor:"pointer", fontSize:15 }}>
            새로고침
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  enabled: import.meta.env.PROD,
  tracesSampleRate: 0.2,
});

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => {
      registration.unregister();
    });
  });
}

if ("caches" in window) {
  caches.keys().then((keys) => {
    keys.forEach((key) => {
      caches.delete(key);
    });
  });
}

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
