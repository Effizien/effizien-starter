import type { FieldGroupDefinition } from 'sanity'

/** The tabs across the top of a document form.
 *
 * Field groups exist for one reason: a document type with twenty fields in one
 * column is a form a non-technical client scrolls past rather than reads. Two
 * tabs — the words, then the metadata — keep the first screen full of the thing
 * the editor actually came to change, and put SEO somewhere deliberate rather
 * than in the way.
 *
 * They live here rather than being declared per document type so the SEO tab is
 * called the same thing and sits in the same place on every document in the
 * Studio. An editor learns the shape of one form, not seven.
 *
 * Deliberately only two. A group with no fields in it still renders as an empty
 * tab, so anything added here has to be a tab genuinely every document type
 * fills. A type needing more appends its own:
 *
 *   groups: [...DOCUMENT_FIELD_GROUPS, {name: 'authorship', title: 'Authorship'}]
 */

/** Group names, so a typo in `group:` is a compile error rather than a field
 *  that silently vanishes from every tab. */
export const FIELD_GROUP = {
  content: 'content',
  seo: 'seo',
} as const

/** Spread into a document type's `groups`. Order here is tab order. */
export const DOCUMENT_FIELD_GROUPS: FieldGroupDefinition[] = [
  { name: FIELD_GROUP.content, title: 'Content', default: true },
  { name: FIELD_GROUP.seo, title: 'SEO & sharing' },
]
