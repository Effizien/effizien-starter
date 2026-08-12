import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ROUTE } from '@/lib/routes'
import { buildMetadata } from '@/lib/seo/metadata'
import { client } from '@/sanity/lib/client'
import { sanityFetch } from '@/sanity/lib/live'
import { POST_QUERY, POST_SLUGS_QUERY, SITE_SETTINGS_QUERY } from '@/sanity/queries'

/** A single article.
 *
 * ⚠️ **A route shell** — see `src/app/page.tsx`.
 *
 * **Marketing archetype only.** A clone that sets `ARCHETYPE` to `catalog` or
 * `docs` in `studio/archetype.ts` has no `post` type, so this route deletes
 * with the blog. Left in place it does no harm — the query returns null and the
 * route 404s — but it will also generate a type for a document type that is not
 * in the schema, which is the confusing failure `studio/archetype.ts` warns
 * about.
 *
 * **This route does not filter on `publishedAt <= now()`, deliberately.**
 * `studio/schemaTypes/documents/post.ts` promises an editor that a future date
 * schedules an article, and article *lists* keep that promise by filtering. The
 * single-article route must not, or a preview link to a scheduled piece 404s
 * for the person who wrote it.
 */

type PostParams = { params: Promise<{ slug: string }> }

export async function generateStaticParams() {
  const slugs = await client.withConfig({ useCdn: false }).fetch(POST_SLUGS_QUERY)

  /* See the note in `src/app/[slug]/page.tsx` — TypeGen cannot see that
     `defined(slug.current)` has already excluded the nulls. */
  return slugs.filter((slug) => slug !== null).map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: PostParams): Promise<Metadata> {
  const { slug } = await params

  const [{ data: post }, { data: site }] = await Promise.all([
    sanityFetch({ query: POST_QUERY, params: { slug }, stega: false }),
    sanityFetch({ query: SITE_SETTINGS_QUERY, stega: false }),
  ])

  if (!post) return {}

  return buildMetadata({
    seo: post.seo,
    site,
    path: ROUTE.post(slug),
    /* `article` rather than `website`, which is what tells a social scraper to
       render the byline and date it already has from the JSON-LD. */
    type: 'article',
  })
}

export default async function PostPage({ params }: PostParams) {
  const { slug } = await params
  const { data: post } = await sanityFetch({ query: POST_QUERY, params: { slug } })

  if (!post) notFound()

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center gap-8 px-6 py-16">
      <article className="flex flex-col gap-3">
        <h1 className="text-balance font-semibold text-4xl tracking-tight">
          {post.title}
        </h1>
        {post.excerpt ? (
          <p className="text-pretty text-lg text-muted-foreground">{post.excerpt}</p>
        ) : null}
        <p className="text-muted-foreground text-sm">
          The article body renders in a later work package.
        </p>
      </article>
    </main>
  )
}
