import NextLink from 'next/link'
import type { ReactNode } from 'react'

import {
  isExternalHref,
  type LinkValue,
  resolveHref,
} from '@/lib/page-builder/resolve-href'

/** A `link` from the CMS, rendered as an anchor.
 *
 *  The resolving happens in `@/lib/page-builder/resolve-href` — a pure function
 *  with unit tests, because "where does this go" is logic and a component is a
 *  bad place to hide logic. This file is the markup and the accessibility
 *  behaviour only.
 *
 *  ## An unresolvable destination is not rendered as a link
 *
 *  If the address cannot be derived — a link the editor never finished, or a
 *  document type whose routes do not exist yet — the children render without an
 *  anchor. An `<a>` with an empty `href` is announced as a link, receives focus,
 *  and navigates to the top of the current page. Text that is not a link is
 *  wrong quietly; a link that does nothing is wrong loudly, at the visitor.
 *
 *  ## "Opens in a new tab" is announced, and that is a mitigation
 *
 *  `studio/schemaTypes/objects/link.ts` tells the editor the site announces it
 *  either way, so the site has to. A new tab takes away the back button, and
 *  someone using magnification or a screen reader often does not notice it
 *  happened (WCAG 3.2.5). The announcement goes inside the anchor so it becomes
 *  part of the accessible name — a `title` attribute would not be read reliably,
 *  and a sibling element would not be read as part of the link.
 */

type LinkProps = {
  readonly value: LinkValue | null | undefined
  readonly children: ReactNode
  readonly className?: string
}

export function Link({ value, children, className }: LinkProps) {
  const href = resolveHref(value)

  if (!href) return <span className={className}>{children}</span>

  const newTab = value?.opensInNewTab === true

  if (isExternalHref(href)) {
    return (
      <a
        href={href}
        className={className}
        /* `noopener` denies the opened page a handle back to this one;
           `noreferrer` is belt and braces on older engines. */
        {...(newTab ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      >
        {children}
        {newTab ? <span className="sr-only"> (opens in a new tab)</span> : null}
      </a>
    )
  }

  return (
    <NextLink
      href={href}
      className={className}
      {...(newTab ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
    >
      {children}
      {newTab ? <span className="sr-only"> (opens in a new tab)</span> : null}
    </NextLink>
  )
}
