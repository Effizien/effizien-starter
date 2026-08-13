import type { JsonLdSchema, WithContext } from '@/lib/seo/json-ld/schema-org'

/** Renders one structured-data object into the page.
 *
 * A Server Component with no interactivity, so nothing here reaches the browser
 * as JavaScript — the script tag is data, not code.
 *
 * ## Why the escaping is not optional
 *
 * The contents of a `<script>` element are parsed by the HTML tokeniser before
 * anything looks at the JSON. A `</script>` sequence *anywhere* inside — in a
 * page title, in an FAQ answer, in a product description — closes the element
 * early and everything after it becomes live markup. An editor who pastes a
 * snippet of HTML into a field would be writing directly into the page.
 *
 * Escaping `<` as `<` prevents that. The two forms are identical to a JSON
 * parser, and the tokeniser never sees a tag. This is the standard mitigation
 * and it is the reason this component exists rather than each route writing its
 * own script tag.
 *
 * ## Multiple objects
 *
 * Render several of these rather than combining them. Separate script tags are
 * explicitly supported, each object stands alone in a diff and in a validator,
 * and a malformed one does not take the others down with it.
 */
export function JsonLd({ data }: { data: WithContext<JsonLdSchema> | null }) {
  /* Builders return null when the content cannot support a valid object — a
     post with no title, a site with no name. Emitting an empty node would be
     worse than emitting nothing: a consumer has to decide what a nameless
     organisation means. */
  if (!data) return null

  return (
    <script
      type="application/ld+json"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: only way to set a script body in JSX; payload is JSON with `<` escaped, so it cannot open or close a tag
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, '\\u003c'),
      }}
    />
  )
}
