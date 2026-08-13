import { toMarkdown } from '@/lib/portable-text/to-markdown'
import { ROUTE } from '@/lib/routes'

import { absoluteUrl } from './site-url'

/** `llms.txt` and `llms-full.txt`.
 *
 * ## Read this before telling a client what these do
 *
 * `llms.txt` is a proposal from September 2024: a Markdown file at the site
 * root giving a language model a curated map of the site. Publishing adoption
 * is real and growing. **Consumption is not demonstrated.** No major model
 * provider has announced that it reads the file, and Google's John Mueller
 * publicly compared it to the keywords meta tag.
 *
 * D-007 already settles the position and it is the honest one: we ship it
 * because it costs a build step and is durable, and we tell clients exactly
 * that. It is cheap insurance, not a ranking lever. Anyone selling it as the
 * latter is selling something nobody has measured.
 *
 * That assessment is also why this is a deliberately plain implementation. It
 * is in the "cheap to refactor" half of this work package — when a consumer
 * demonstrably exists, its actual preferences should drive the format, not a
 * guess made in 2026.
 *
 * ## The two files
 *
 * `llms.txt` is the map: every public document as a link with a description.
 * `llms-full.txt` is the territory: the full text of the articles.
 *
 * Both derive from the same visibility rule as the sitemap — a page an editor
 * hid from search does not appear in either.
 */

type Listing = {
  readonly title?: string | null
  readonly slug?: string | null
  readonly description?: string | null
}

type LlmsIndex = {
  readonly site?: {
    readonly siteName?: string | null
    readonly description?: string | null
  } | null
  readonly home?: {
    readonly title?: string | null
    readonly description?: string | null
  } | null
  readonly pages?: readonly Listing[] | null
  readonly posts?: readonly Listing[] | null
}

/** `# Name`, then `> description`. The header both files share. */
function header(site: LlmsIndex['site'], extra?: string): string[] {
  const lines = [`# ${site?.siteName ?? 'Website'}`]
  if (site?.description) lines.push('', `> ${site.description}`)
  if (extra) lines.push('', extra)
  return lines
}

/** `- [Title](url): description` — the format's one structural element. */
function linkLine(title: string, path: string, description?: string | null): string {
  const link = `- [${title}](${absoluteUrl(path)})`
  /* Descriptions are collapsed to one line. A newline inside a list item ends
     the item, so a multi-line description would silently truncate the map. */
  return description ? `${link}: ${description.replace(/\s+/g, ' ').trim()}` : link
}

export function buildLlmsTxt(data: LlmsIndex): string {
  const lines = header(data.site)

  const pages = (data.pages ?? []).filter((page) => page.title && page.slug)
  const posts = (data.posts ?? []).filter((post) => post.title && post.slug)

  if (data.home?.title || pages.length > 0) {
    /* Blank line after the heading as well as before it. A list directly
       against a heading still renders, but every published example of this
       format separates them, and the consumer is a parser someone else wrote. */
    lines.push('', '## Pages', '')

    /* The home page has no slug — its route is fixed — so it is listed
       explicitly rather than falling out of the `pages` loop. */
    if (data.home?.title) {
      lines.push(linkLine(data.home.title, ROUTE.home, data.home.description))
    }

    for (const page of pages) {
      // biome-ignore lint/style/noNonNullAssertion: filtered above
      lines.push(linkLine(page.title!, ROUTE.page(page.slug!), page.description))
    }
  }

  if (posts.length > 0) {
    lines.push('', '## Articles', '')
    for (const post of posts) {
      // biome-ignore lint/style/noNonNullAssertion: filtered above
      lines.push(linkLine(post.title!, ROUTE.post(post.slug!), post.description))
    }
  }

  return `${lines.join('\n')}\n`
}

type FullArticle = {
  readonly title?: string | null
  readonly slug?: string | null
  readonly publishedAt?: string | null
  readonly description?: string | null
  readonly author?: { readonly name?: string | null } | null
  readonly body?: Parameters<typeof toMarkdown>[0]
}

type LlmsFull = {
  readonly site?: LlmsIndex['site']
  readonly posts?: readonly FullArticle[] | null
}

/** The date, as a date. Times are noise in a document meant to be read, and an
 *  unparseable value is omitted rather than rendered as "Invalid Date". */
function publishedLine(post: FullArticle): string | null {
  const parts: string[] = []

  if (post.publishedAt) {
    const date = new Date(post.publishedAt)
    if (!Number.isNaN(date.getTime())) parts.push(date.toISOString().slice(0, 10))
  }
  if (post.author?.name) parts.push(post.author.name)

  return parts.length > 0 ? parts.join(' · ') : null
}

export function buildLlmsFullTxt(data: LlmsFull): string {
  const posts = (data.posts ?? []).filter((post) => post.title && post.slug)

  const lines = header(
    data.site,
    posts.length > 0
      ? `Full text of ${posts.length} article${posts.length === 1 ? '' : 's'}.`
      : undefined,
  )

  for (const post of posts) {
    const body = toMarkdown(post.body)

    lines.push('', '---', '')
    lines.push(`## ${post.title}`)
    /* The source URL is on its own line and always present. It is the one thing
       a model quoting this file needs in order to cite the site rather than the
       file. */
    // biome-ignore lint/style/noNonNullAssertion: filtered above
    lines.push('', absoluteUrl(ROUTE.post(post.slug!)))

    const published = publishedLine(post)
    if (published) lines.push(published)

    if (post.description) lines.push('', `> ${post.description}`)
    if (body) lines.push('', body)
  }

  return `${lines.join('\n')}\n`
}
