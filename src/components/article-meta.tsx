type ArticleMetaProps = {
  readonly publishedAt?: string | null
  readonly author?: {
    readonly name?: string | null
    readonly role?: string | null
  } | null
  readonly topics?: readonly { readonly title?: string | null }[] | null
}

/** Who wrote an article, when, and what it is about.
 *
 *  ## The date is a `<time>` with a machine-readable `dateTime`
 *
 *  "18 August 2026" is unambiguous to a person and ambiguous to everything else,
 *  and the same string in an American locale reads as a different day. The
 *  `dateTime` attribute carries the ISO value the CMS actually stores, so the
 *  rendered text is free to be written for humans.
 *
 *  ## The formatting is pinned to a locale on purpose
 *
 *  `toLocaleDateString()` with no locale uses the *server's* locale, which is a
 *  Vercel region rather than anywhere the reader lives — so the same page can
 *  render a different date format after a deployment moves region, with nothing
 *  in the diff to explain it. `en-GB` is stated, and a client site that wants
 *  another one changes it here.
 *
 *  ## Topics are text, not links
 *
 *  `category` documents have no route yet. A topic rendered as a link would be
 *  a link to a page that does not exist; when topic archives arrive they become
 *  links here, and `ROUTE` gains an entry.
 */
export function ArticleMeta({ publishedAt, author, topics }: ArticleMetaProps) {
  const named = (topics ?? [])
    .map((topic) => topic?.title)
    .filter((title): title is string => typeof title === 'string' && title.length > 0)

  if (!publishedAt && !author?.name && named.length === 0) return null

  return (
    <div className="flex flex-col gap-2 text-muted-foreground text-sm">
      <div className="flex flex-wrap items-center gap-x-2">
        {author?.name ? (
          <span>
            By <span className="font-medium text-foreground">{author.name}</span>
            {author.role ? `, ${author.role}` : null}
          </span>
        ) : null}

        {author?.name && publishedAt ? <span aria-hidden="true">·</span> : null}

        {publishedAt ? (
          <time dateTime={publishedAt}>
            {new Date(publishedAt).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </time>
        ) : null}
      </div>

      {named.length > 0 ? (
        /* A list, so it is announced as one and its length is known before the
           first item — the same reason the features block uses one. */
        <ul className="flex flex-wrap gap-2">
          {named.map((title) => (
            /* `text-foreground`, not the `text-muted-foreground` inherited from
               the wrapper. Muted text on a muted background is the pairing the
               token set does not guarantee, and axe caught it here at 
               serious severity the first time an article had a topic to show.
               A chip is small text, so it is exactly where contrast matters
               most. */
            <li
              key={title}
              className="rounded-md bg-muted px-2 py-0.5 text-foreground text-xs"
            >
              {title}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
