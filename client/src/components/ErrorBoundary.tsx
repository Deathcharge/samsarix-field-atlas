import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error("Samsarix Field Atlas render failure", error, info);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="error-state">
          <p className="eyebrow">The local view stopped</p>
          <h1>The atlas could not render this route.</h1>
          <p>
            No remote work was started and no data was sent. Reload the page to
            restore the deterministic reference state.
          </p>
          <button
            className="button button-primary"
            onClick={() => window.location.reload()}
            type="button"
          >
            Reload the atlas
          </button>
        </main>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
