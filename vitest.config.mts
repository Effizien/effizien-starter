import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

/** Unit tests.
 *
 * `02-STACK-V1.md` §9 listed Vitest as MODULE; WP6 promotes it to CORE, because
 * the specs these tests protect — the heading outline in particular — ship in
 * every archetype and therefore in every cloned site. A runner that only some
 * sites have cannot guard something all of them inherit. It is dev-only: no
 * runtime cost, no bundle cost.
 *
 * ## Two test locations, deliberately
 *
 * **`src/**` — tests beside the code they cover.** These are typechecked by
 * `pnpm typecheck`, because `tsconfig.json` includes them.
 *
 * **`tests/**` — tests that import from `studio/`.** The app and the Studio are
 * two applications with separate dependency trees, and `tsconfig.json` excludes
 * `studio` for that reason: type-checking it from here would resolve `sanity`
 * against the app's `node_modules`, where it deliberately is not installed. A
 * cross-boundary test placed in `src/` would drag that failure into
 * `pnpm typecheck`.
 *
 * So they live in `tests/`, which `tsconfig.json` also excludes. The trade is
 * real and worth stating: **those files are not typechecked.** Vitest strips
 * their types and runs them, so a broken import fails loudly as a test failure
 * rather than a type error. For tests whose entire job is asserting that two
 * files agree at runtime, that is the right failure mode — but it is a weaker
 * guarantee than the `src/` tests get, and it is why only genuinely
 * cross-boundary tests belong there.
 */
export default defineConfig({
  test: {
    /* Node, not jsdom. Everything tested here is a pure function over plain
       data — no DOM, no React. Component tests arrive with WP12 and will need a
       browser environment; adding one now would be config for nothing. */
    environment: 'node',
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],

    /* Deliberately fake, and deliberately not read from `.env.local`.
     *
     * `src/sanity/env.ts` throws at import time when these are absent, so
     * anything importing the Sanity boundary — `urlFor`, and therefore the
     * JSON-LD builders — cannot be tested without them. Placeholders rather
     * than the real project's values because nothing here talks to Sanity: the
     * builders construct CDN URLs from strings, and a test asserting a URL
     * should not change meaning if the project is renamed. It also keeps a real
     * project id out of the assertions, where it would quietly become a second
     * place that value lives.
     *
     * Pure functions with no Sanity import need none of this — see
     * `src/sanity/lib/asset-id.ts`, which was split out of `image.ts` for
     * exactly that reason. */
    env: {
      NEXT_PUBLIC_SANITY_PROJECT_ID: 'test-project',
      NEXT_PUBLIC_SANITY_DATASET: 'test-dataset',
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),

      /* `studio/presentation.ts` imports two functions from `sanity/presentation`,
         and `sanity` is deliberately absent from this app's dependency tree.
         The stub is what lets a test here read the Studio's route table and
         check the app's mirror of it against the real thing rather than against
         a copy of a copy. See the stub for when it stops being adequate. */
      'sanity/presentation': fileURLToPath(
        new URL('./tests/stubs/sanity-presentation.ts', import.meta.url),
      ),
    },
  },
})
