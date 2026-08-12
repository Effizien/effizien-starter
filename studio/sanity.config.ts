import { visionTool } from '@sanity/vision'
import type { SanityDefinedAction } from 'sanity'
import { defineConfig } from 'sanity'
import { presentationTool } from 'sanity/presentation'
import { structureTool } from 'sanity/structure'

import { SINGLETON_TYPES } from './document-types'
import { locations, mainDocuments } from './presentation'
import { schemaTypes } from './schemaTypes'
import { structure } from './structure'

/* Studio env vars are prefixed SANITY_STUDIO_ — that is the CLI's own
   convention and the only prefix it injects into the Studio bundle. They are
   build-time public by design, which is fine: project ID and dataset are not
   secrets. Never put an API token in a SANITY_STUDIO_ variable. */
const projectId = process.env.SANITY_STUDIO_PROJECT_ID
const dataset = process.env.SANITY_STUDIO_DATASET ?? 'production'

if (!projectId) {
  throw new Error(
    'Missing SANITY_STUDIO_PROJECT_ID.\n\n' +
      'Copy .env.example to studio/.env.local and fill it in. ' +
      'Find the project ID at https://www.sanity.io/manage',
  )
}

/** Document actions withheld from singletons.
 *
 * The Studio offers Delete and Duplicate on every document, and neither makes
 * sense for a document the frontend fetches by a fixed `_id`. Duplicate creates
 * a second Site settings that nothing reads; Delete and Unpublish take the home
 * page off the root route. Both sit one menu click away from an editor who was
 * looking for "Discard changes".
 *
 * Everything else stays. Publish, Discard changes and restore-from-history are
 * how an editor undoes their own mistake, and removing them would trade one
 * support call for another.
 *
 * `satisfies` checks the names against Sanity's built-in action ids at compile
 * time — a renamed built-in becomes a type error here rather than a filter that
 * silently stops matching. */
const SINGLETON_DISABLED_ACTIONS: ReadonlySet<string> = new Set<string>([
  'delete',
  'duplicate',
  'unpublish',
  'unpublishVersion',
] satisfies SanityDefinedAction[])

export default defineConfig({
  name: 'default',
  title: 'Effizien Starter',
  projectId,
  dataset,

  plugins: [
    /* `structure` replaces the default alphabetical list of document types with
       something a client can navigate, and is where singletons are pinned to a
       fixed document id. See structure.ts. */
    structureTool({ structure }),
    /* Presentation gives editors click-to-edit against the live Next.js app.
       The preview origin must point at the running app, and that app's URL has
       to be in the project's CORS origins with credentials — `pnpm cors` in
       this directory does the localhost one. */
    presentationTool({
      previewUrl: {
        /* `initial`, not the deprecated `origin`: same meaning, and `origin` is
           scheduled for removal. */
        initial: process.env.SANITY_STUDIO_PREVIEW_URL ?? 'http://localhost:3000',
        previewMode: {
          enable: '/api/draft-mode/enable',
        },
      },
      /* Which document a previewed URL belongs to, and which URLs a document
         appears at. Without these the tool renders the site but cannot connect
         either direction to a document. See presentation.ts. */
      resolve: {
        mainDocuments,
        locations,
      },
    }),
    /* Vision runs GROQ against the real dataset. Test a query here before
       putting it in code — a query that returns nothing looks identical to a
       rendering bug from the app side. */
    visionTool(),
  ],

  schema: {
    types: schemaTypes,
  },

  document: {
    /* Two of the three mechanisms that make a singleton a singleton; the third
       is the fixed document id in structure.ts. All three read the same list in
       document-types.ts, so adding a singleton is one edit. */

    /* Remove the destructive actions from singletons. `action` is undefined on
       actions contributed by plugins, which are left alone — this filter only
       withholds the built-ins it names. */
    actions: (prev, { schemaType }) =>
      SINGLETON_TYPES.has(schemaType)
        ? prev.filter(
            (action) => !action.action || !SINGLETON_DISABLED_ACTIONS.has(action.action),
          )
        : prev,

    /* Keep singletons out of every "Create" affordance: the navbar button, the
       button at the top of a list pane, and "Create new" on a reference input.
       All three are fed by this one list of templates.

       A document type's default initial-value template carries the type name as
       its id, which is what this matches. A hand-written template for a
       singleton — the localised-home-page case — would need adding here too. */
    newDocumentOptions: (prev) =>
      prev.filter((template) => !SINGLETON_TYPES.has(template.templateId)),
  },
})
