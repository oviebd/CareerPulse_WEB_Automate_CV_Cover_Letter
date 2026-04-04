'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';

type Props = { children: ReactNode };

type State = { hasError: boolean; message: string | null };

export class CVEditorErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: null };
  }

  static getDerivedStateFromError(err: Error): State {
    return { hasError: true, message: err.message };
  }

  componentDidCatch(err: Error, info: ErrorInfo) {
    console.error('CV editor error boundary', err, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-900">
          <p className="font-medium">Something went wrong loading the CV editor.</p>
          {this.state.message ? (
            <p className="mt-2 font-mono text-xs opacity-80">{this.state.message}</p>
          ) : null}
          <Button
            variant="secondary"
            size="sm"
            className="mt-4"
            onClick={() => this.setState({ hasError: false, message: null })}
          >
            Try again
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
