import { Component, type ErrorInfo, type ReactNode } from "react";
import { useLocation } from "react-router-dom";

type RouteErrorBoundaryProps = {
  children: ReactNode;
};

type RouteErrorBoundaryState = {
  error: Error | null;
};

class RouteErrorBoundaryInner extends Component<RouteErrorBoundaryProps, RouteErrorBoundaryState> {
  state: RouteErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): RouteErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[workspace] Render crashed", error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-3 bg-background px-6 text-center">
        <p className="text-sm font-semibold text-foreground">This workspace hit an error.</p>
        <p className="max-w-md text-sm text-muted-foreground">{this.state.error.message}</p>
        <button
          type="button"
          className="text-sm font-medium text-primary underline underline-offset-4"
          onClick={() => window.location.reload()}
        >
          Reload
        </button>
      </div>
    );
  }
}

export function RouteErrorBoundary({ children }: RouteErrorBoundaryProps) {
  const location = useLocation();
  return <RouteErrorBoundaryInner key={location.pathname}>{children}</RouteErrorBoundaryInner>;
}
