// src/ErrorBoundary.jsx
import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("Clearpath error boundary caught:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: "100vh", display: "flex", alignItems: "center",
          justifyContent: "center", background: "#F9F8F8", padding: 24
        }}>
          <div style={{ maxWidth: 420, textAlign: "center" }}>
            <div style={{ fontSize: 36, marginBottom: 16 }}>⚠️</div>
            <div style={{
              fontFamily: "'Syne', sans-serif", fontSize: 18,
              fontWeight: 700, color: "#111827", marginBottom: 8
            }}>
              Something went wrong
            </div>
            <div style={{
              fontFamily: "'Lora', serif", fontSize: 13,
              color: "#6B7280", lineHeight: 1.6, marginBottom: 24
            }}>
              An unexpected error occurred. Your work has been auto-saved.
              Refresh the page to continue.
            </div>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: "#C2410C", color: "#FFFFFF", border: "none",
                borderRadius: 6, padding: "10px 24px", fontFamily: "'Syne', sans-serif",
                fontSize: 12, fontWeight: 700, cursor: "pointer",
                letterSpacing: ".08em", textTransform: "uppercase"
              }}
            >
              Refresh page
            </button>
            {this.state.error && (
              <div style={{
                marginTop: 20, padding: "10px 14px", background: "#FEF2F2",
                border: "1px solid #FECACA", borderRadius: 6,
                fontFamily: "monospace", fontSize: 11, color: "#991B1B",
                textAlign: "left", wordBreak: "break-all"
              }}>
                {this.state.error.message}
              </div>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
