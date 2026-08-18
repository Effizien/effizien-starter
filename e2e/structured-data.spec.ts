import { expect, test } from '@playwright/test'

import { FAQ_ROUTE, ROUTES_WITHOUT_FAQS } from './routes'

/** Structured data has to describe what the page actually shows.
 *
 * Google's requirement is not a style guide — markup describing content a
 * visitor cannot find on the page is a manual action, and `buildFaqPage` sat
 * deliberately unwired from WP5 until WP12 chunk 3 for exactly that reason. The
 * moment it was wired, the claim became testable, so it is tested.
 *
 * ## Why this cannot be a unit test
 *
 * The failure mode is not in the builder. It is in the gap between the markup
 * and the **hydrated** DOM, and only a browser can see that gap. The FAQ block
 * was built on the shadcn Accordion first: the server-rendered HTML contained
 * every answer, `curl` looked correct, and Radix then unmounted the closed
 * panels' children during hydration. The page shipped `FAQPage` markup listing
 * three answers the rendered document did not contain, and nothing anywhere in
 * the suite noticed. That is what this file exists to catch.
 */

test(`${FAQ_ROUTE.name} (${FAQ_ROUTE.path}) states only answers the page contains`, async ({
  page,
}) => {
  await page.goto(FAQ_ROUTE.path)

  const faq = await page
    .locator('script[type="application/ld+json"]')
    .evaluateAll((nodes) =>
      nodes
        .map((node) => JSON.parse(node.textContent ?? '{}'))
        .find((object) => object['@type'] === 'FAQPage'),
    )

  expect(faq, 'the page renders an FAQ block, so it must emit FAQPage').toBeTruthy()
  expect(faq.mainEntity.length).toBeGreaterThan(0)

  /* Read from the disclosures themselves rather than from `main`, which
     contains the JSON-LD script and would happily match the markup against
     itself — the exact tautology that made an earlier manual check pass while
     the answers were absent from the DOM. */
  const rendered = await page
    .locator('main details')
    .evaluateAll((nodes) => nodes.map((node) => node.textContent ?? ''))

  expect(rendered.length).toBe(faq.mainEntity.length)

  for (const question of faq.mainEntity) {
    const answer: string = question.acceptedAnswer.text

    expect(
      rendered.some((text) => text.includes(answer.slice(0, 60))),
      `"${question.name}" is marked up but its answer is not in the rendered page`,
    ).toBe(true)
  }
})

for (const path of ROUTES_WITHOUT_FAQS) {
  test(`${path} emits no FAQPage, because it renders no questions`, async ({ page }) => {
    await page.goto(path)

    const types = await page
      .locator('script[type="application/ld+json"]')
      .evaluateAll((nodes) =>
        nodes.map((node) => JSON.parse(node.textContent ?? '{}')['@type']),
      )

    expect(types).not.toContain('FAQPage')
  })
}
