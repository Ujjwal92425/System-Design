'use client';

import { Component, type ReactNode, type ErrorInfo } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * ErrorBoundary — catches React render errors in the simulation panel
 * and shows a fallback UI instead of crashing the entire canvas.
 *
 * WHY: The simulation panel has many dynamic sub-components (MetricsChart,
 * SimNodeTable, ChaosPanel) that can throw during render if data is
 * malformed. Without this boundary, a single tick with NaN values
 * crashes the entire Workspace page.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary] Simulation panel crashed:', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="border-t border-yc-border bg-yc-bg-alt flex flex-col items-center justify-center p-6 gap-3"
             style={{ height: '100%', minHeight: 200 }}>
          <AlertTriangle className="w-8 h-8 text-red-400" />
          <div className="text-center">
            <p className="text-sm font-bold text-yc-text">{this.props.fallbackTitle || 'Simulation panel error'}</p>
            <p className="text-[11px] text-yc-text-muted mt-1 max-w-md">
              Something went wrong rendering simulation data. This is usually caused by unexpected tick values.
            </p>
            {this.state.error && (
              <pre className="text-[9px] text-red-400 mt-2 max-w-full overflow-auto bg-red-50/50 p-2 rounded">
                {this.state.error.message}
              </pre>
            )}
          </div>
          <button
            onClick={this.handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-yc-accent text-white rounded-lg text-[11px] font-bold hover:bg-yc-accent-hover transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Dismiss &amp; Reset
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
