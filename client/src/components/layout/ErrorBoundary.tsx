import React, { Component, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Uncaught error in React lifecycle:", error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 text-center">
          <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl border border-gray-100 space-y-6">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-red-50 border border-red-100 text-red-600 shadow-sm animate-bounce">
              <AlertTriangle className="h-8 w-8" />
            </div>
            <div className="space-y-2">
              <h1 className="text-xl font-bold text-gray-900">Workspace Execution Crash</h1>
              <p className="text-xs font-semibold text-gray-500 leading-relaxed">
                A component in your active workspace has crashed. Our technical monitors have logged the event.
              </p>
            </div>

            {this.state.error && (
              <div className="p-3 bg-gray-50 border border-gray-100 rounded-lg text-left text-3xs font-mono text-gray-500 overflow-x-auto max-h-32">
                {this.state.error.toString()}
              </div>
            )}

            <button
              onClick={this.handleReload}
              className="inline-flex items-center space-x-2 w-full justify-center px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition cursor-pointer"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Reload Workspace Console</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
