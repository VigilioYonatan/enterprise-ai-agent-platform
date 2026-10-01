import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button, Card } from '../libs/ui';

type Props = { children: ReactNode };
type State = { error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(
      'UI boundary caught error:',
      error.message,
      info.componentStack,
    );
  }

  render() {
    if (this.state.error) {
      return (
        <div role="alert" className="mx-auto max-w-xl p-6">
          <Card>
            <h2 className="text-lg font-bold">
              Something went wrong in this view
            </h2>
            <p className="mt-2 text-sm text-foreground-muted">
              {this.state.error.message}
            </p>
            <div className="mt-4">
              <Button
                variant="secondary"
                onClick={() => this.setState({ error: null })}
              >
                Try again
              </Button>
            </div>
          </Card>
        </div>
      );
    }
    return this.props.children;
  }
}
