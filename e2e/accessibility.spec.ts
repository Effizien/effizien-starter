import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import { GONE_ROUTE, SCANNED_ROUTES } from './routes'

/** The automated half of WCAG 2.2 AA.
 *
 * ## What "automated" is worth, stated because it gets forgotten
 *
 * **axe-core catches roughly 30–40% of real accessibility barriers.**
 * `02-STACK-V1.md` §8 says so and `AGENTS.md` repeats it. A green run here
 * means the site has no *machine-detectable* violations. It does not mean the
 * site is accessible: axe cannot tell whether alt text is accurate, whether
 * focus order makes sense, whether an error message is announced at a useful
 * moment, or whether a heading describes what follows it. The manual
 * screen-reader protocol in chunk 5 is not a formality — it is the other 60%.
 *
 * ## Scanned against the stated target, not against everything axe knows
 *
 * The tag filter below pins the run to WCAG 2.2 AA — the target in `AGENTS.md`.
 * Without it, axe also reports its own best-practice rules, which are good
 * advice and are *not* the standard the project committed to. Mixing them makes
 * a gate that fails for reasons nobody agreed to, and the response to that is
 * always to weaken the gate.
 */

/** WCAG 2.0, 2.1 and 2.2, levels A and AA. `wcag22aa` alone would miss
 *  everything the earlier versions carry forward, which is most of it. */
const WCAG_22_AA = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22a', 'wcag22aa']

/** axe's findings are unreadable in a bare assertion diff — a violation is a
 *  deep object with nodes, targets and HTML. This turns one into the two lines
 *  someone actually needs: what broke, and where. */
function summarise(violations: Awaited<ReturnType<AxeBuilder['analyze']>>['violations']) {
  return violations
    .map((violation) => {
      const targets = violation.nodes
        .map((node) => node.target.join(' '))
        .slice(0, 5)
        .join('\n      ')
      return `  ${violation.id} (${violation.impact}) — ${violation.help}\n      ${targets}\n      ${violation.helpUrl}`
    })
    .join('\n')
}

for (const route of SCANNED_ROUTES) {
  test(`${route.name} (${route.path}) has no WCAG 2.2 AA violations`, async ({
    page,
  }) => {
    const response = await page.goto(route.path)

    /* A 404 scans clean and proves nothing. Without this, emptying the dataset
       turns the whole suite green. */
    expect(
      response?.status(),
      `${route.path} did not load — is the seeded content still in the dataset?`,
    ).toBe(200)

    const { violations } = await new AxeBuilder({ page }).withTags(WCAG_22_AA).analyze()

    expect(violations.length, `\n${summarise(violations)}`).toBe(0)
  })
}

test(`${GONE_ROUTE.name} (${GONE_ROUTE.path}) has no WCAG 2.2 AA violations`, async ({
  page,
}) => {
  const response = await page.goto(GONE_ROUTE.path)

  /* The status is the point of this route — see `src/app/api/gone/route.ts`.
     Asserting it here means the accessibility suite also guards the redirect
     map's one non-3xx outcome. */
  expect(response?.status()).toBe(410)

  const { violations } = await new AxeBuilder({ page }).withTags(WCAG_22_AA).analyze()

  expect(violations.length, `\n${summarise(violations)}`).toBe(0)
})

/** Two structural rules the project states explicitly and axe does not check.
 *
 * axe has `page-has-heading-one`, but it is a best-practice rule rather than a
 * WCAG one, so the tag filter above excludes it — correctly, since the filter
 * exists to keep the gate to the agreed standard. These assert the rule the
 * project actually committed to, from `.claude/rules/routes.md`: exactly one
 * `h1`, one `main`.
 *
 * They matter more than they look. `heading-outline.ts` derives which element
 * becomes the `h1`, chunk 1 tests that derivation in isolation, and this is the
 * end of that chain — the assertion that what the derivation decided is what
 * the browser actually received. When WP12 lands, this is the test that catches
 * a renderer ignoring the outline it was given.
 */
for (const route of SCANNED_ROUTES) {
  test(`${route.name} (${route.path}) has exactly one h1 and one main`, async ({
    page,
  }) => {
    await page.goto(route.path)

    await expect(page.locator('h1')).toHaveCount(1)
    await expect(page.locator('main')).toHaveCount(1)
  })
}
