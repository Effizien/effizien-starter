/** The schema.org shapes this site actually emits — hand-written, on purpose.
 *
 * The obvious alternative is `schema-dts`, Google's own generated types. It was
 * considered and rejected: it is a multi-megabyte `.d.ts` whose deeply nested
 * unions measurably slow `tsc`, and `pnpm check` runs `tsc` before every commit.
 * Its error messages when a shape is wrong are also famously unreadable —
 * several hundred lines of union candidates for a missing property.
 *
 * We emit five types. Five narrow interfaces cost about a hundred lines, make
 * the wrong shape a one-line error, and document exactly what this site claims
 * about itself. That is a better trade at this size. **Revisit if the number of
 * emitted types passes roughly a dozen**, or if a client needs a vocabulary
 * (Event, JobPosting, LocalBusiness with opening hours) broad enough that
 * hand-writing becomes the larger job.
 *
 * Every type here is a *subset* of the real schema.org vocabulary — only the
 * properties this site fills in. Adding a property means adding it here first,
 * which is the point: it is a deliberate act, visible in a diff.
 */

/** The wrapper every top-level object needs. Nested objects must NOT carry it —
 *  a nested `@context` is not invalid, just noise, and it is the most common
 *  hand-written JSON-LD mistake. */
export type WithContext<T> = T & { readonly '@context': 'https://schema.org' }

/** An image, as schema.org wants it.
 *
 * A bare URL string is legal and is what most sites emit. `ImageObject` with
 * explicit dimensions is preferred by Google's own documentation, and we always
 * know the dimensions because we asked the Sanity CDN for a specific size. */
export type ImageObject = {
  readonly '@type': 'ImageObject'
  readonly url: string
  readonly width?: number
  readonly height?: number
  readonly caption?: string
}

export type PostalAddress = {
  readonly '@type': 'PostalAddress'
  readonly streetAddress?: string
  readonly addressLocality?: string
  readonly addressRegion?: string
  readonly postalCode?: string
  readonly addressCountry?: string
}

export type Person = {
  readonly '@type': 'Person'
  readonly name: string
  /** Their role at the organisation. `jobTitle`, not `role` — schema.org has no
   *  `role` property on Person, and an invented property is silently dropped. */
  readonly jobTitle?: string
}

export type Organization = {
  readonly '@type': 'Organization'
  /** An absolute URL used as this entity's stable identity across the site, so
   *  an Article's `publisher` can point at it rather than restating it. */
  readonly '@id': string
  readonly name: string
  readonly url: string
  readonly description?: string
  readonly logo?: ImageObject
  readonly image?: ImageObject
  readonly email?: string
  readonly telephone?: string
  readonly address?: PostalAddress
  /** Profile URLs on other services. This is how a search engine works out
   *  which accounts belong to this organisation — the one part of entity
   *  resolution a site can state directly. */
  readonly sameAs?: readonly string[]
}

export type Article = {
  readonly '@type': 'Article'
  readonly '@id': string
  readonly headline: string
  readonly description?: string
  readonly image?: ImageObject
  readonly datePublished?: string
  readonly dateModified?: string
  readonly author?: Person
  /** A reference to the Organization by `@id`, which must be emitted on the
   *  same page or the reference dangles. */
  readonly publisher?: { readonly '@id': string }
  readonly mainEntityOfPage?: string
  readonly about?: readonly string[]
}

export type Product = {
  readonly '@type': 'Product'
  readonly '@id': string
  readonly name: string
  readonly description?: string
  readonly image?: readonly ImageObject[]
  /** The manufacturer's article number. `sku` is the retail equivalent and is
   *  wrong for a catalogue with no checkout. */
  readonly mpn?: string
  readonly category?: string
  readonly brand?: { readonly '@type': 'Brand'; readonly name: string }
}

export type ListItem = {
  readonly '@type': 'ListItem'
  readonly position: number
  readonly name: string
  /** Omitted on the last item, which is the page you are already on. */
  readonly item?: string
}

export type BreadcrumbList = {
  readonly '@type': 'BreadcrumbList'
  readonly itemListElement: readonly ListItem[]
}

export type Question = {
  readonly '@type': 'Question'
  readonly name: string
  readonly acceptedAnswer: {
    readonly '@type': 'Answer'
    readonly text: string
  }
}

export type FAQPage = {
  readonly '@type': 'FAQPage'
  readonly mainEntity: readonly Question[]
}

/** Anything this site is willing to put in a script tag. */
export type JsonLdSchema = Organization | Article | Product | BreadcrumbList | FAQPage
