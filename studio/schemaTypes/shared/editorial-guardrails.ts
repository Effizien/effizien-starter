import type { CustomValidator, SlugifierFn, SlugValue } from 'sanity'
import { getPublishedId } from 'sanity'

/** Editorial guardrails — the limits, and the policy that decides their severity.
 *
 *  ## Error or warning
 *
 *  A Sanity error blocks publishing. A warning shows a yellow note and lets the
 *  editor publish anyway. Choosing between them is a content decision, not a
 *  technical one, and getting it wrong is how a CMS becomes something the client
 *  resents and then routes around.
 *
 *  **Error** when publishing would break something the editor cannot see:
 *    - the page would not render, or would render blank (no title, no address,
 *      no sections)
 *    - two documents would fight over one URL
 *    - an accessibility guarantee would fail (an undescribed informative image,
 *      a link with no destination, a dropdown with no accessible name)
 *    - a menu would render as an empty bar on every page of the site
 *
 *  **Warn** when the content will render correctly but badly:
 *    - a title Google will truncate
 *    - alternative text long enough to become a wall of speech
 *    - eleven top-level menu entries nobody reads past the fifth of
 *
 *  The editor knows things the schema does not. A legal notice genuinely might
 *  need a 90-character title. Blocking that publish teaches the client that the
 *  Studio is an obstacle, and the next thing they learn is who to ask to have the
 *  validation removed. Warnings survive handover; overzealous errors do not.
 *
 *  **Never error on something the editor cannot fix from inside this document.**
 *  A missing translation, an unset environment variable, a failed deploy: none of
 *  those belong in a validation rule, because the only available response is to
 *  give up.
 *
 *  **Every message says why, and what to do.** "Required" tells an editor that
 *  they have done something wrong and nothing else. Each message here names the
 *  consequence — what a visitor or a search engine sees — and the next action.
 *
 *  ## Where the numbers come from
 *
 *  They are soft limits attached to warnings, so approximately right is right
 *  enough. They live in one object so that "how long can a title be" has one
 *  answer across the whole schema, and so a client with a different house style
 *  changes it in one place rather than in nine validation rules.
 */
export const LIMIT = {
  /** Search results truncate around here. Not a hard cap — see the policy above. */
  pageTitle: 70,
  /** Google's desktop description snippet. Also the cap on the site-wide default
   *  description, because it is used in exactly the same place. */
  metaDescription: 155,
  /** A URL segment past this stops being readable and starts being a hash. */
  slug: 64,
  /** Screen readers do not pause inside alternative text, so past this it is one
   *  unbroken sentence. Longer explanations belong in a caption or the page. */
  altText: 125,
  /** A caption longer than this is a paragraph that has been put in the wrong
   *  place. */
  caption: 200,
  /** Appended to every page title, so every character here is a character of the
   *  page title that search results cut off. */
  siteName: 60,
  /** Menu labels are laid out side by side; long ones wrap or push their
   *  neighbours off the row. */
  navigationLabel: 32,
  /** Top-level menu entries before a menu stops being scannable. */
  headerEntries: 7,
  /** Links inside one dropdown or one footer column. */
  groupLinks: 8,
  /** Footer columns and standalone footer links, combined. */
  footerEntries: 8,
  /** Social icons in a footer row before it reads as clutter. */
  socialProfiles: 8,
} as const

/* `STUDIO_API_VERSION` and `hasText` are owned by `./validation`. Both were
   defined here as well — identical implementations, written independently — and
   two copies of a predicate is two things to keep in step for no benefit.
   Re-exported so the files importing them from this module keep working.

   `STUDIO_API_VERSION` is pinned deliberately and matched to the app's
   `src/sanity/env.ts`: an API version is a date, and letting it float means
   Sanity can change what a validation query returns without a line of this
   repository changing. */
export { hasText, STUDIO_API_VERSION } from './validation'

import { hasText, STUDIO_API_VERSION } from './validation'

/* ⚠️ `toSlug` below is NOT the same function as `toSlug` in `./slug-field`, and
   they must not be merged without deciding which behaviour wins.

   Both were written independently and are near-identical — lowercase,
   transliterate, NFD, strip marks, hyphenate, trim, truncate — but they truncate
   at DIFFERENT lengths: this one at `LIMIT.slug` (64), the other at 96. Unifying
   them silently changes the slug generated for any title longer than 64
   characters, and a changed slug on a live document is a dead URL plus a
   redirect nobody wrote.

   This one slugifies heading text into in-page anchors. The other generates
   document slugs. They happen to share an algorithm; they do not share a
   contract. Leave them separate until there are tests to change them under
   (WP6), then pick one limit deliberately. */

/** Characters that survive being typed into an address bar but should not.
 *
 *  Sanity's default slugifier lowercases and hyphenates spaces but leaves
 *  accented characters alone, so "Über uns" becomes "über-uns" — legal, and
 *  percent-encoded to `%C3%BCber-uns` everywhere it is pasted. Unicode
 *  decomposition handles most of it; these have no decomposed form.
 *
 *  "ü" → "ue" is the German reading, which is the market this starter serves. A
 *  client in Sweden changes this map once, before any content exists. */
const TRANSLITERATIONS: Record<string, string> = {
  ä: 'ae',
  ö: 'oe',
  ü: 'ue',
  ß: 'ss',
  å: 'aa',
  æ: 'ae',
  ø: 'oe',
  œ: 'oe',
  đ: 'd',
  ð: 'd',
  þ: 'th',
  ł: 'l',
}

/** Title → URL segment. ASCII, lowercase, hyphen-separated, no surprises.
 *
 *  Kept as a plain function as well as a `SlugifierFn` so the validation below
 *  can call it to *suggest* a fix, and so a slug typed by hand and a slug made
 *  by the Generate button are held to one standard. */
export const toSlug = (input: string): string =>
  input
    .toLowerCase()
    .replace(/[äöüßåæøœđðþł]/g, (character) => TRANSLITERATIONS[character] ?? character)
    .normalize('NFD')
    // Non-spacing marks: exactly what NFD leaves behind once an accent has been
    // split off its letter.
    .replace(/\p{Mn}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, LIMIT.slug)
    .replace(/-+$/g, '')

/** What the field's Generate button runs. */
export const slugifySegment: SlugifierFn = (source) => toSlug(source)

/** Explains, in words an editor can act on, why a web address is unusable.
 *
 *  Returns `true` for an empty value: emptiness is `rule.required()`'s job, and
 *  two rules reporting one mistake produces two red messages for it. */
export const describeSlugProblem: CustomValidator<SlugValue | undefined> = (value) => {
  const current = value?.current?.trim()
  if (!current) return true

  if (current.includes('/')) {
    return 'Web addresses here are a single word or phrase — "brand-strategy", not "services/brand-strategy". Addresses with a folder in them need a routing change in the site itself, so ask before designing around one.'
  }

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(current)) {
    const suggestion = toSlug(current)
    return suggestion
      ? `Use lowercase letters, numbers and single hyphens only. "${current}" would be escaped in the address bar and look mangled wherever the link is shared — click Generate and it becomes "${suggestion}".`
      : `"${current}" contains nothing a web address can carry. Addresses use the letters a–z, numbers and hyphens, so a title in another script needs an address written by hand.`
  }

  if (current.length > LIMIT.slug) {
    return `This address is ${current.length} characters. Past about ${LIMIT.slug} it stops being something anyone can read out or type, and gets truncated when it is shared. Shorten it to the two or three words that matter.`
  }

  return true
}

/** Two documents of one type cannot share a web address.
 *
 *  Scoped to the document's own type on purpose: a page at `/guides` and an
 *  article whose address is `guides` do not collide, because articles are served
 *  under `/blog/`. Widening this to every type produces false alarms the editor
 *  has no way to resolve.
 *
 *  Drafts and release versions of *this* document are not clashes with it.
 *  `getPublishedId` strips the `drafts.` and `versions.<release>.` prefixes,
 *  which a hand-rolled `replace(/^drafts\./, '')` does not.
 *
 *  When the i18n module is added, widen the filter to `language == $language` —
 *  `/about` in English and `/about` in German are different addresses. */
export const isSlugUnique: CustomValidator<SlugValue | undefined> = async (
  value,
  context,
) => {
  const current = value?.current?.trim()
  const document = context.document
  if (!current || !document?._type) return true

  const id = getPublishedId(document._id)
  const client = context.getClient({ apiVersion: STUDIO_API_VERSION })

  const matches = await client.fetch<{ _id: string; title?: string | null }[]>(
    '*[_type == $type && slug.current == $slug]{_id, title}',
    { type: document._type, slug: current },
  )

  const clash = matches.find((match) => getPublishedId(match._id) !== id)
  if (!clash) return true

  const other = hasText(clash.title) ? `"${clash.title}"` : 'Another document'
  return `${other} already uses the address "${current}". Two documents cannot share one address — whichever is published second wins and the other quietly becomes unreachable. Change this one, or rename the other and add a redirect for its old address.`
}
