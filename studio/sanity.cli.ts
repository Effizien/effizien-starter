import { defineCliConfig } from 'sanity/cli'

/** Studio CLI + TypeGen configuration.
 *
 * TypeGen reads GROQ queries out of the Next.js app one directory up and writes
 * a single types file back into it. That crossing is deliberate: the schema is
 * defined here, the queries live there, and the generated types have to land
 * where the app's tsconfig can see them.
 *
 * `sanity-typegen.json` is deprecated — this is the supported location. */
export default defineCliConfig({
  api: {
    projectId: process.env.SANITY_STUDIO_PROJECT_ID,
    dataset: process.env.SANITY_STUDIO_DATASET,
  },
  typegen: {
    /* Regenerates during `sanity dev` and `sanity build`, so types follow query
       edits without anyone remembering to run a script. This is one of the
       concrete reasons the Studio is standalone rather than embedded — an
       embedded Studio cannot hook into `next dev` and needs a manual run after
       every query change. */
    enabled: true,
    path: '../src/**/*.{ts,tsx}',
    schema: 'schema.json',
    generates: '../sanity.types.ts',
    overloadClientMethods: true,
  },
  deployment: {
    /* Auto-updates: the Studio pulls Sanity bugfixes without a dependency bump
       or redeploy. Only standalone Studios can do this, and at agency scale it
       is the difference between one update and one update per site.
       (Top-level `autoUpdates` is deprecated — it belongs here.)

       Per site, add the `appId` from
       https://www.sanity.io/manage/project/<projectId>/studios to pin a version
       channel instead of always tracking latest. Left unset here because it is
       project-specific and cannot be a template default. */
    autoUpdates: true,
  },
})
