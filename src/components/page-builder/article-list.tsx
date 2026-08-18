import { stegaClean } from 'next-sanity'

import { Link } from '@/components/link'
import { SectionHeading } from '@/components/page-builder/section-heading'
import { SanityImage, type SanityImageValue } from '@/components/sanity-image'
import { Button } from '@/components/ui/button'
import { headingTag, type SectionHeadingLevels } from '@/lib/page-builder/heading-outline'
import { type LinkValue, resolveHref } from '@/lib/page-builder/resolve-href'

/** A list of articles. The marketing archetype's one page-builder block.
 *
 *  ## This is also the blog index
 *
 *  `/blog` is not a route of its own: it is an ordinary `page` with the slug
 *  "blog" whose builder holds one of these. That is what `studio/presentation.ts`
 *  tells the editor and what `src/lib/routes.ts` encodes, and it is why adding a
 *  blog index needed no new route — the same block on a home page showing three
 *  articles is the same component.
 *
 *  ## The `limit` is applied here, not in the query
 *
 *  The projection takes a fixed ceiling of twelve because GROQ slice bounds are
 *  safest as constants and `limit` is editor-controlled. Trimming to the
 *  editor's number is this component's job. The "ones I choose" branch is not
 *  trimmed: the editor picked exactly those, in that order, and silently
 *  dropping the fourth would be the block disagreeing with the form that
 *  produced it.
 *
 *  ## Addresses come from `ROUTE`
 *
 *  An article's address is `ROUTE.post(slug)` — never a string built here. The
 *  query returns slugs for precisely that reason.
 */

type ArticleValue = {
  readonly _id: string
  readonly title?: string | null
  readonly slug?: string | null
  readonly publishedAt?: string | null
  readonly excerpt?: string | null
  readonly mainImage?: SanityImageValue | null
}

export type ArticleListValue = {
  readonly _key: string
  readonly _type: string
  readonly heading?: string | null
  readonly intro?: string | null
  readonly source?: string | null
  readonly limit?: number | null
  readonly action?: {
    readonly label?: string | null
    readonly destination?: LinkValue | null
  } | null
  readonly articles?: readonly ArticleValue[] | null
}

type ArticleListProps = {
  readonly value: ArticleListValue
  readonly levels: SectionHeadingLevels
}

export function ArticleList({ value, levels }: ArticleListProps) {
  /* Stega, for the same reason every other comparison on a Sanity string cleans
     first: in draft mode `'selected'` carries invisible characters and compares
     unequal, which would silently switch the editor's chosen source. */
  const source = stegaClean(value.source)

  const all = (value.articles ?? []).filter((article) => article.title && article.slug)

  const articles =
    source === 'selected' ? all : all.slice(0, Math.max(1, value.limit ?? 3))

  if (articles.length === 0) return null

  const ArticleHeading = headingTag(levels.child)
  const actionHref = value.action?.destination
    ? resolveHref(value.action.destination)
    : null

  return (
    <section className="flex flex-col gap-8">
      {value.heading || value.intro ? (
        <div className="flex max-w-2xl flex-col gap-3">
          <SectionHeading
            level={levels.section}
            className="text-balance font-semibold text-3xl tracking-tight"
          >
            {value.heading}
          </SectionHeading>

          {value.intro ? (
            <p className="text-pretty text-muted-foreground">{value.intro}</p>
          ) : null}
        </div>
      ) : null}

      <ul className="flex flex-col gap-8">
        {articles.map((article) => (
          <li key={article._id} className="flex flex-col gap-2">
            {article.mainImage ? (
              <SanityImage
                value={article.mainImage}
                width={800}
                sizes="(min-width: 768px) 768px, 100vw"
                className="w-full"
              />
            ) : null}

            <ArticleHeading className="text-balance font-semibold text-xl tracking-tight">
              {/* The whole heading is the link, so the accessible name is the
                  article's own title rather than a row of identical "Read more"
                  entries in a screen reader's list of links. */}
              <Link
                value={{
                  linkType: 'internal',
                  internalTarget: { _type: 'post', slug: article.slug },
                }}
                className="underline-offset-4 hover:underline"
              >
                {article.title}
              </Link>
            </ArticleHeading>

            {article.publishedAt ? (
              <time
                dateTime={article.publishedAt}
                className="text-muted-foreground text-sm"
              >
                {new Date(article.publishedAt).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </time>
            ) : null}

            {article.excerpt ? (
              <p className="text-pretty text-muted-foreground">{article.excerpt}</p>
            ) : null}
          </li>
        ))}
      </ul>

      {actionHref && value.action?.label ? (
        <div>
          <Button asChild variant="outline">
            <Link value={value.action.destination}>{value.action.label}</Link>
          </Button>
        </div>
      ) : null}
    </section>
  )
}
