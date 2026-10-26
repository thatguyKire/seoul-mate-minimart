// Playwright's test, failing any test whose pages break the Content-Security-Policy.
//
// The preview server sends the site's real headers (SDD 5.5), so every end-to-end test runs
// under the real policy. A change that needs an inline script or style, or a request to an
// address the policy does not list, fails here instead of on the live site.
import { test as base, expect } from '@playwright/test';

interface ViolationWindow {
  reportCspViolation: (violation: string) => Promise<void>;
}

export const test = base.extend<{ cspViolations: string[] }>({
  cspViolations: [
    async ({ context }, use) => {
      const violations: string[] = [];
      await context.exposeBinding('reportCspViolation', (_source, violation: string) => {
        violations.push(violation);
      });
      await context.addInitScript(() => {
        document.addEventListener('securitypolicyviolation', (event) => {
          const blocked = event.blockedURI || 'inline code';
          void (window as unknown as ViolationWindow).reportCspViolation(
            `${event.effectiveDirective} blocked ${blocked} on ${event.documentURI}`,
          );
        });
      });
      await use(violations);
      expect(violations, 'Content-Security-Policy violations').toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
export type { Locator, Page } from '@playwright/test';
