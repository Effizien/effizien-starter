/** Stand-in for `sanity/presentation`, so `studio/presentation.ts` can be
 *  imported by a test in this app.
 *
 * `studio/` is a separate application with its own dependency tree — `sanity`
 * is deliberately not installed here (see `pnpm-workspace.yaml`, which tells
 * pnpm to ignore that peer). Without this, importing the Studio's route table
 * to check it against the app's copy would fail at module load.
 *
 * Both functions are identity in the real package for our purposes: they exist
 * to attach types and to give the Studio a place to hang its resolvers, and
 * neither transforms the value in a way that affects `ROUTE`. The test asserts
 * on `ROUTE` alone, which is a plain object of string functions and never
 * passes through either.
 *
 * **If a future test asserts on `mainDocuments` or `locations`, this stub stops
 * being adequate** — it would be asserting on the stub's behaviour rather than
 * Sanity's. At that point the right move is to lift `ROUTE` out of
 * `presentation.ts` into a dependency-free module the Studio imports, which
 * removes the need for a stub at all.
 */

export const defineDocuments = <T>(value: T): T => value
export const defineLocations = <T>(value: T): T => value
