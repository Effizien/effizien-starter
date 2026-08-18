# Content restore

Recovering content an editor deleted or overwrote.

**Every Sanity CLI command here is prefixed `pnpm --dir studio exec`.** The CLI reads
`sanity.cli.ts` for the project and dataset, and that file lives in `studio/` — run these
from the repository root without the prefix and they fail asking you to pick a project,
which in a non-interactive shell is an error rather than a prompt. The prefix matches the
existing scripts in `package.json`.

---

## Read this before you need it: you have three days

Sanity keeps a document's revision history for a period set by the **plan**, not by the
project. Verified two ways — Sanity's own documentation, and the dataset itself, which
carries a `system.retention` document stating the number:

```bash
pnpm --dir studio exec sanity documents get _.retention._maximum_project
```

**Expected:** a `days` value. On this project it is **`3`**, which is the Free plan.

| Plan | History retained |
|---|---|
| **Free** | **3 days** |
| Growth | 90 days |
| Enterprise | 365 days, or custom |

Revisions older than the cutoff are truncated into a single entry and the underlying
transactions are **permanently deleted**. Truncation runs daily.

**The current published and draft versions are always available** — retention governs how
far *back* you can go, not whether the document exists. So a bad edit noticed on Monday is
recoverable; the same edit noticed a fortnight later is not.

**Dataset-level backups are an Enterprise feature.** On any other plan the only backup
that exists is one you took yourself, and nothing in this repository takes one
automatically. See *The gap* below — that is the honest state, and it is a decision to
make deliberately rather than discover during an incident.

---

## 1 · A document was edited wrongly, and still exists

Fastest path, and the one an editor can run themselves.

1. Open the document in the Studio.
2. Open history: click the document status indicator at the bottom of the editor, or the
   **...** menu at the top right, then **History**.
   **Expected:** a list of revisions, newest first, labelled *Published*, *Edited* or
   *Unpublished*. Entries older than the cutoff appear as a single **Truncated** item.
3. Select the revision from before the bad edit and compare it against the current one.
   **Expected:** a side-by-side diff of what changed.
4. Restore it, then publish.
   **Expected:** the document returns to that content, and the restore itself becomes a
   new revision — nothing is overwritten destructively.

5. Redeploy if the change affects redirects, or if the page must be regenerated
   immediately. Content changes reach the site through the publish webhook; **redirects do
   not** — they are read at build time. See `deploy.md`.

---

## 2 · A document was deleted, within retention

It is no longer in the Studio, so there is nothing to open. Its history is still on the
server and can be read by ID.

6. Get the document as it was at a time before the deletion:
   ```bash
   curl -s "https://<projectId>.api.sanity.io/v2026-02-01/data/history/production/documents/<documentId>?time=2026-08-17T12:00:00Z"
   ```
   **Expected:** `{"documents":[{ ... }]}` containing the document as it stood at that
   moment. Verified against this dataset: a timestamp from before a change returns the
   earlier shape, not the current one.

   `?lastRevision=true` returns the most recent revision instead of a point in time.

7. Recreate it from that JSON — paste the fields back into a new document in the Studio,
   or write it back with `sanity documents create`.
   **Expected:** the document exists again. **Its `_id` will be new unless you set it
   explicitly**, and any reference pointing at the old `_id` stays broken until it is
   repointed.

**You need the document ID**, which is the difficulty. If you do not know it, look for it
in a recent export, in a Presentation preview URL, or in the site's own build output for
the affected route.

**This path is documented rather than rehearsed.** The endpoint and its parameters were
verified against a live document; recovering a genuinely deleted one was not tested,
because doing so means deleting real content. Treat step 7 as the first thing to walk
through on a throwaway dataset.

---

## 3 · Older than retention

There is no recovery from Sanity. The transactions are gone.

Your only option is an export taken before the loss. If none exists, the content is gone
and the honest thing is to say so quickly — an editor who knows within the hour can often
rewrite from memory or from the old site.

---

## Taking an export

The whole dataset, documents and assets, as one gzipped tarball.

8. Run it:
   ```bash
   pnpm --dir studio exec sanity dataset export production ./backup-$(date +%Y-%m-%d).tar.gz
   ```
   **Expected**, verified on this dataset:
   ```
   Exporting documents... (17/17)
   Downloading assets... (6/6)
   Export finished (1s)
   ```
   A small site produces a few megabytes, most of it images. It took one second here.

9. Restore from one into a **scratch dataset first**, never straight over production:
   ```bash
   pnpm --dir studio exec sanity dataset create restore-test
   pnpm --dir studio exec sanity dataset import ./backup-2026-08-18.tar.gz restore-test
   ```
   **Expected:** documents and assets imported. Check the content is what you expect
   before going near the live dataset.

10. Only then import into production, choosing the collision behaviour deliberately:
    - `--missing` — add only documents that are absent. **The safe default**; existing
      content is untouched.
    - `--replace` — overwrite documents that already exist. Correct when restoring a known
      good snapshot over a corrupted one, and destructive if it is not.

    **Expected:** the count of documents imported matches what you intended.

---

## The gap, stated plainly

**On the Free plan this project has a three-day window and no automatic backup.** That is
enough for "an editor broke a page this morning" and nothing else.

**On a small marketing site that is a reasonable place to stand, and it is the deliberate
choice here.** What this content is matters: marketing copy is recreatable, usually exists
in a document or on the site being replaced, and total loss costs hours of rewriting
rather than an unrecoverable business record. A site holding orders, submissions or
anything a customer typed would not get the same answer. Option 1 below covers the
likeliest losses, and option 3 is the right move when clients get big enough to fund
it.

Nothing in this repository schedules an export. Three ways to close it, in order of cost:

1. **Run the export by hand before anything risky** — a content migration, a schema
   change, a bulk edit. Free, and it covers the cases most likely to cause loss.
2. **Schedule it** — a cron job or scheduled GitHub Action running step 8 and keeping the
   tarball somewhere off Sanity. **An export only reads**, so a Viewer-scoped token is
   enough; the CLI takes it from a login session or `SANITY_AUTH_TOKEN`, and `export` has
   no `--token` flag because it is not a write. *Importing* is the write, which is why
   `import` does take `-t`.
3. **Upgrade the plan** — Growth takes retention from 3 days to 90 and removes most of the
   urgency.

Whichever is chosen, **record it in `HANDOFF.md`**. A client who believes their content is
backed up when it is not has been told something false, and this is the document where
that gets corrected.
