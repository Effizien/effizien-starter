import type { ValidationContext } from 'sanity'
import { getPublishedId } from 'sanity'

/** Plumbing shared by every validator that has to ask the dataset a question.
 *
 * Two things live here because more than one validator needs them and a second
 * copy of either would drift silently: the API version those queries run
 * against, and the rule for deciding whether a matching document is *this*
 * document wearing a different id.
 */

/** The API version the Studio's own validation queries run against.
 *
 * Pinned, not floating, for the same reason as `src/sanity/env.ts`: an API
 * version is a date, and a drifting one lets a change at Sanity alter a
 * validation result without a line of this repository changing. Keep it in step
 * with `apiVersion` in `src/sanity/env.ts` — a uniqueness check that disagrees
 * with the query the site runs is worse than no check at all.
 */
export const STUDIO_API_VERSION = '2026-02-01'

/** Non-empty once trimmed.
 *
 * `rule.required()` accepts a field containing three spaces. A reader does not.
 */
export function hasText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

/** Is this value used by any *other* document?
 *
 * One piece of content has several ids at once: `abc` when published,
 * `drafts.abc` while being edited, `versions.<release>.abc` inside a content
 * release. All three are the same document, and a uniqueness check that does not
 * collapse them reports a document as a duplicate of itself — the classic "I
 * can't publish and I changed nothing" support ticket. `getPublishedId` from
 * `sanity` strips all of those prefixes; a hand-rolled `replace(/^drafts\./)`
 * does not, and silently stops working the first time the client uses a release.
 *
 * Fetches ids rather than a `count()` precisely so that collapsing can happen in
 * JS. The result set is normally one row.
 *
 * `fieldPath` is interpolated into the query because GROQ cannot parameterise an
 * attribute path. That is safe here and only here: every caller passes a string
 * literal written by a developer. Never pass a value that came from a document,
 * a URL, or an editor.
 */
export async function isValueUniqueAcrossDocuments(
  value: string,
  options: { fieldPath: string; types: readonly string[] },
  context: ValidationContext,
): Promise<boolean> {
  const self = getPublishedId(context.document?._id ?? '')
  const client = context.getClient({ apiVersion: STUDIO_API_VERSION })

  const ids = await client.fetch<string[]>(
    `*[_type in $types && ${options.fieldPath} == $value]._id`,
    { types: [...options.types], value },
  )

  return ids.every((id) => getPublishedId(id) === self)
}
