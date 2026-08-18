import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import { datasetIsEmpty, SCAFFOLD_SKIP_REASON } from './dataset'
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

    /* A 404 scans clean and proves nothing, so the status is asserted rather
       than assumed. The skip above it separates "nothing published yet" from
       "a published page has gone missing" — see `dataset.ts`. */
    if (response?.status() !== 200) {
      test.skip(await datasetIsEmpty(page.request), SCAFFOLD_SKIP_REASON)
    }

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

  /* The 410 comes from a `redirect` document, so this route needs content in
     the same way the others do. */
  if (response?.status() !== 410) {
    test.skip(await datasetIsEmpty(page.request), SCAFFOLD_SKIP_REASON)
  }

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
    const response = await page.goto(route.path)
    if (response?.status() !== 200) {
      test.skip(await datasetIsEmpty(page.request), SCAFFOLD_SKIP_REASON)
    }

    await expect(page.locator('h1')).toHaveCount(1)
    await expect(page.locator('main')).toHaveCount(1)
  })
}

/** Headings descend without skipping.
 *
 * The third structural rule from `.claude/rules/routes.md`, and the one with no
 * automated cover until now. axe has `heading-order`, but it is a best-practice
 * rule rather than a WCAG success criterion, so the tag filter above excludes
 * it — deliberately, since that filter keeps the gate to the standard the
 * project actually committed to.
 *
 * That left a real gap the moment WP12 started rendering headings. The levels
 * are *derived*: a section's own heading comes from `headingOutline`, and a
 * heading inside its prose comes from `richTextHeadingLevel` one level below
 * that. Two derivations that each look right in isolation can still produce an
 * `h2` followed by an `h4` on the page, and nothing else in this suite notices.
 *
 * This is not hypothetical. Seeding the dataset for WP12 chunk 2 produced
 * exactly that skip, from a rich text field whose first heading was a
 * "Subheading" with no "Heading" above it — an arrangement the Studio's
 * `describeHeadingOutlineProblem` rejects, and which reached the dataset only
 * because content written through the API bypasses Studio validation. The page
 * rendered without any visible sign of being wrong.
 */
for (const route of SCANNED_ROUTES) {
  test(`${route.name} (${route.path}) has no skipped heading levels`, async ({
    page,
  }) => {
    const response = await page.goto(route.path)
    if (response?.status() !== 200) {
      test.skip(await datasetIsEmpty(page.request), SCAFFOLD_SKIP_REASON)
    }

    const levels = await page
      .locator('main :is(h1, h2, h3, h4, h5, h6)')
      .evaluateAll((nodes) => nodes.map((node) => Number(node.tagName[1])))

    /* A page with one heading or none cannot skip, and asserting otherwise
       would fail the routes that are still shells. */
    for (let index = 1; index < levels.length; index++) {
      const previous = levels[index - 1] as number
      const current = levels[index] as number

      expect(
        current - previous,
        `heading ${index + 1} jumps from h${previous} to h${current} — ` +
          'the outline derived a level with nothing above it',
      ).toBeLessThanOrEqual(1)
    }
  })
}
