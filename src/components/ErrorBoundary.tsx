import { Component, type ErrorInfo, type ReactNode } from "react";
import { ErrorState } from "./ui";

export class ErrorBoundary extends Component<{ children: ReactNode }, { message: string | null }> {
  state = { message: null };

  static getDerivedStateFromError(error: Error) {
    return { message: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Render failed", error, info);
  }

  render() {
    if (this.state.message) {
      return (
        <main className="min-h-dvh bg-muted px-4 py-8">
          <div className="mx-auto max-w-2xl">
            <ErrorState message={`The app hit a display error: ${this.state.message}`} />
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}
