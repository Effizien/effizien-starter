/** What an address an editor types is allowed to look like.
 *
 * Used by redirects, and by anything else storing a path rather than generating
 * one. Kept separate from the slug rules on purpose: a slug is a name *we*
 * generate, so it can be held to a strict shape (lowercase, hyphens, one
 * segment). A redirect source has to reproduce whatever the old site actually
 * used — `/Ueber-Uns.html`, `/index.php`, `/produkte/2019_katalog`. Forcing the
 * slug rules onto those would make the one field that must match history exactly
 * unable to.
 *
 * Every message names the consequence. "Invalid path" tells a client nothing
 * they can act on.
 */

const HAS_SCHEME = /^[a-z][a-z0-9+.-]*:/i
const ALLOWED_CHARACTERS = /^\/[A-Za-z0-9\-._~%/]*$/

/** Does this look like it is trying to be a complete address elsewhere? */
export function looksAbsolute(value: string): boolean {
  return HAS_SCHEME.test(value) || value.startsWith('//')
}

/** A path on this site: starts with `/`, no domain, no query string.
 *
 * Returns `true`, or the sentence explaining what to do instead. Empty values
 * pass — `required()` owns emptiness, and two red messages under one empty field
 * reads like the form itself is broken.
 */
export function isSitePath(value: string | undefined): true | string {
  if (!value) return true

  if (value !== value.trim()) {
    return 'Remove the spaces at the start or end. A web address cannot contain them, so this would never match anything.'
  }

  if (looksAbsolute(value)) {
    return 'Enter only the part after your domain name. For https://example.com/old-page, that is /old-page.'
  }

  if (!value.startsWith('/')) {
    return `Start with a slash — "/${value}" rather than "${value}". Without it the address is read as relative to whichever page the visitor happens to be on.`
  }

  if (/[?#]/.test(value)) {
    return 'Remove everything from the ? or # onwards. Only the path is matched, so a query string here would stop this ever matching.'
  }

  if (value.length > 1 && value.endsWith('/')) {
    return `Remove the trailing slash — "${value.replace(/\/+$/, '')}". The site treats the two as one address and always settles on the version without it.`
  }

  if (!ALLOWED_CHARACTERS.test(value)) {
    return 'Use only letters, numbers and - _ . ~ / — anything else has to be percent-encoded in a real address, so it will not match as typed.'
  }

  return true
}

/** A complete address somewhere else entirely. Used by redirects that hand a
 *  section of the site over to another domain. */
export function isAbsoluteHttpsUrl(value: string): true | string {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return 'That is not a complete web address. Include the protocol and the domain, like https://example.com/page.'
  }

  if (url.protocol !== 'https:') {
    return 'Use https://. Sending visitors to an insecure address triggers a browser warning and loses the trust signal the redirect was meant to preserve.'
  }

  return true
}
