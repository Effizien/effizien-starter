import { defineEnableDraftMode } from 'next-sanity/draft-mode'

import { client } from '@/sanity/lib/client'
import { token } from '@/sanity/lib/token'

/** Draft mode entry point for the Presentation tool.
 *
 * The Studio calls this with a signed, single-use secret that next-sanity
 * validates before enabling draft mode, so this route is not an open door to
 * unpublished content — the token never leaves the server unless that check
 * passes. */
export const { GET } = defineEnableDraftMode({
  client: client.withConfig({ token }),
})
