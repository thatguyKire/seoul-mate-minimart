import { Component, type ReactNode } from 'react';
import { store } from '../config/store';

interface State {
  failed: boolean;
}

/**
 * Last line of defense for a crash (SDD 6): a plain page with a reload button and the
 * Messenger and phone links, in English because translations may be what failed.
 * Step 10 reports the error to Sentry here.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  override state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  override render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main className="crash container">
        <h1>Something went wrong</h1>
        <p>Reload the page to try again. To order or ask about an item, contact us directly.</p>
        <p className="crash__actions">
          <button
            type="button"
            className="button button--primary"
            onClick={() => {
              window.location.reload();
            }}
          >
            Reload the page
          </button>
          <a className="button button--secondary" href={store.messengerUrl}>
            Message us on Messenger
          </a>
          <a className="button button--secondary" href={store.phone.href}>
            Call {store.phone.display}
          </a>
        </p>
      </main>
    );
  }
}
