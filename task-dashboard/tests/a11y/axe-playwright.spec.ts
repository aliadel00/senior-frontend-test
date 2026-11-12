import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const ROUTES = ['/dashboard', '/analytics', '/users'];
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];
/** Bootstrap gate: fail on critical + serious only */
const FAIL_IMPACTS = new Set(['critical', 'serious']);

test.describe('accessibility @axe', () => {
  for (const route of ROUTES) {
    test(`axe WCAG 2.1 AA: ${route}`, async ({ page }) => {
      await page.goto(route);
      await page.waitForSelector('app-root');
      await page.waitForLoadState('networkidle');

      const results = await new AxeBuilder({ page })
        .withTags(WCAG_TAGS)
        .exclude('.nav-link--disabled')
        .exclude('.cdk-overlay-container')
        .exclude('.mat-mdc-menu-panel')
        .analyze();

      const violations = results.violations.filter((v) => FAIL_IMPACTS.has(v.impact ?? ''));

      if (violations.length) {
        const summary = violations
          .map(
            (v) =>
              `${v.impact}: ${v.id} (${v.nodes.length} nodes) — ${v.help}\n` +
              v.nodes
                .slice(0, 3)
                .map((n) => `  ${n.target.join(' ')}`)
                .join('\n'),
          )
          .join('\n');
        expect(violations, summary).toEqual([]);
      }
    });
  }
});
