import { visionTool } from '@sanity/vision'
import { defineConfig } from 'sanity'
import { presentationTool } from 'sanity/presentation'
import { structureTool } from 'sanity/structure'

import { schemaTypes } from './schemaTypes'

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

export default defineConfig({
  name: 'default',
  title: 'Effizien Starter',
  projectId,
  dataset,

  plugins: [
    structureTool(),
    /* Presentation gives editors click-to-edit against the live Next.js app.
       previewUrl.origin must point at the running app, and that app's URL has
       to be in the project's CORS origins with credentials — `pnpm cors` in
       this directory does the localhost one. */
    presentationTool({
      previewUrl: {
        origin: process.env.SANITY_STUDIO_PREVIEW_URL ?? 'http://localhost:3000',
        previewMode: {
          enable: '/api/draft-mode/enable',
        },
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
})
