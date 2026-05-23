/** React 错误边界：捕获子树渲染异常并展示友好错误页。 */
import { Component, ReactNode } from "react";
import { withAppBase } from "../appBase";
import { translate, getStoredLocale } from "../locales";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
    window.location.href = withAppBase("/");
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      const locale = getStoredLocale();
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-slate-100 dark:bg-slate-950">
          <div className="text-center max-w-md">
            <div className="text-6xl mb-4">⚠️</div>
            <h1 className="font-display text-xl font-bold text-ink-950 dark:text-white mb-2">
              {translate(locale, "common.pageError")}
            </h1>
            <p className="text-ink-600 dark:text-slate-300 mb-4">
              {this.state.error?.message || translate(locale, "common.unknownError")}
            </p>
            <button
              onClick={this.handleReset}
              className="px-4 py-2 bg-accent text-white rounded-xl hover:bg-accent-dim transition"
            >
              {translate(locale, "common.backHome")}
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
