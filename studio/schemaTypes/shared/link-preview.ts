import { SLUGLESS_LINK_TARGETS } from './linkable-types'

/** Studio previews for anything that holds a `link`.
 *
 *  A collapsed row in a menu or a page-builder block is all an editor sees when
 *  they are scanning ten of them for the one that is wrong. "Link" tells them
 *  nothing; "/pricing" or "https://…" tells them everything. Shared, so that
 *  every place a link appears describes it the same way. */

/** Paths to select for `describeLinkDestination`.
 *
 *  `prefix` is the path to the `link` object itself: empty for `link`'s own
 *  preview, `'destination'` for something holding one in a field of that name.
 *  Reference paths (`internalTarget.title`) are resolved by the Studio's preview
 *  resolver — this is the one projection in Sanity that may follow a reference
 *  without an explicit `->`. */
export const linkPreviewSelection = (prefix = ''): Record<string, string> => {
  const at = (path: string) => (prefix ? `${prefix}.${path}` : path)
  return {
    linkType: at('linkType'),
    externalUrl: at('externalUrl'),
    internalTitle: at('internalTarget.title'),
    internalPath: at('internalTarget.slug.current'),
    internalType: at('internalTarget._type'),
  }
}

type LinkPreviewValues = {
  linkType?: unknown
  externalUrl?: unknown
  internalTitle?: unknown
  internalPath?: unknown
  internalType?: unknown
}

const text = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined

/** One line describing where a link goes, for a preview subtitle. */
export const describeLinkDestination = (values: LinkPreviewValues): string => {
  if (values.linkType === 'external') {
    return text(values.externalUrl) ?? 'No address yet'
  }

  if (values.linkType !== 'internal') return 'Nowhere yet'

  const title = text(values.internalTitle)
  if (!title) return 'No page chosen yet'

  const path = text(values.internalPath)
  if (path) return `/${path}`

  const type = text(values.internalType)
  // A linkable type with no slug has a fixed route, and the only one is home.
  if (type && SLUGLESS_LINK_TARGETS.includes(type)) return '/'

  return title
}
