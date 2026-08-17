import { defineConfig, devices } from '@playwright/test'

/** Browser tests — accessibility today, end-to-end when there is a site to test.
 *
 * ## Two runners, two extensions, no overlap
 *
 * `*.test.ts` is Vitest — pure functions, no browser, milliseconds.
 * `*.spec.ts` is Playwright — a real browser against a real build, seconds.
 *
 * The split is by extension rather than by directory so that neither runner can
 * accidentally pick up the other's files and fail in a confusing way. Vitest's
 * `include` and this file's `testMatch` are deliberately disjoint.
 *
 * ## Against a production build, not the dev server
 *
 * `next dev` injects a development overlay and a error toast into the page.
 * Both are Next's markup rather than ours, both would be scanned, and a gate
 * that reports violations nobody can fix is a gate that gets switched off. The
 * production build is also what an auditor would look at.
 *
 * The cost is that the first run builds the site. `reuseExistingServer` means a
 * second run reuses whatever is already on the port locally, so the wait is
 * once per session rather than once per run.
 *
 * ## What this proves today, honestly
 *
 * The routes render titles, headings and landmarks — the page-builder sections
 * are not built until WP12. So a green run here proves the **harness** works
 * and the shell is sound; it does not yet prove much about the site. That is
 * the accepted cost of running WP6 first, recorded in `03-BUILD-PLAN.md`, and
 * the reason chunk 1's unit tests are the part of this work package that pays
 * immediately.
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.ts',

  /* A failing accessibility check is a real finding, not a flake. Retrying one
     until it passes would hide exactly the intermittent rendering bugs worth
     knowing about. */
  retries: 0,
  fullyParallel: true,

  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],

  use: {
    baseURL: 'http://localhost:3000',
    /* Only on failure, and only what is needed to understand it. */
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },

  /* Chromium alone. axe-core's results are engine-independent for the rules it
     checks — it reads the accessibility tree, not pixels — so a second browser
     triples the run time to re-confirm the same violations. Cross-browser
     coverage is an end-to-end concern, and belongs with the first real e2e
     test rather than here. */
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],

  webServer: {
    command: 'pnpm build && pnpm start',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    /* A cold Next build plus server start. Generous on purpose: a timeout here
       reads as a test failure and sends someone looking in the wrong place. */
    timeout: 180_000,
  },
})
