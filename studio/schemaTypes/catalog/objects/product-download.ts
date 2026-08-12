import { DownloadIcon } from '@sanity/icons/Download'
import { defineField, defineType } from 'sanity'

/** A file a buyer downloads: a datasheet, a certificate, a manual.
 *
 * In a catalogue with no checkout, this is frequently the thing a visitor came
 * for. An engineer specifying a part wants the PDF; a procurement team wants the
 * certificate. Modelling it properly is what stops those files being uploaded
 * into the description as links to somebody's Dropbox.
 *
 * ## No file type, size or page count fields
 *
 * All three are on the asset, and a link that says "Datasheet (PDF, 2.4 MB)"
 * must be built from `file.asset->{extension, size}` rather than from something
 * an editor typed — WCAG 2.2 AA (2.4.4, 3.2.4) wants the link to warn that it
 * downloads rather than navigates, and a hand-typed size is wrong the first time
 * the file is replaced. Anything derivable from the upload is not a field.
 *
 * ## Why `kind` is a list and not free text
 *
 * The downloads section groups by it, and "Certificates" as a heading only works
 * if every certificate says the same word. `other` is included deliberately: a
 * closed list with no way out gets satisfied by mislabelling, which is worse
 * than an honest bucket.
 */
export const productDownload = defineType({
  name: 'productDownload',
  title: 'Download',
  type: 'object',
  icon: DownloadIcon,
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      description:
        'What this file is, as the link should read — "Technical datasheet", ' +
        '"Declaration of conformity". The file size and type are added automatically, ' +
        'so do not type them here.',
      validation: (rule) =>
        rule
          .required()
          .error(
            'Give this a title. Without one the link falls back to the uploaded ' +
              'filename, and someone using a screen reader hears "D S underscore four ' +
              'eight two one dot P D F".',
          ),
    }),

    defineField({
      name: 'kind',
      title: 'Kind',
      type: 'string',
      description: 'Used to group the downloads on the product page.',
      options: {
        layout: 'dropdown',
        list: [
          { title: 'Datasheet', value: 'datasheet' },
          { title: 'Certificate', value: 'certificate' },
          { title: 'Safety data sheet', value: 'safetyDataSheet' },
          { title: 'Manual or instructions', value: 'manual' },
          { title: 'Brochure', value: 'brochure' },
          { title: 'Something else', value: 'other' },
        ],
      },
      initialValue: 'datasheet',
      validation: (rule) => rule.required(),
    }),

    defineField({
      name: 'file',
      title: 'File',
      type: 'file',
      description:
        'PDF wherever you have the choice — it opens on every device and cannot be ' +
        'edited by accident. Check the file has selectable text rather than being a ' +
        'scan: a scanned datasheet is unreadable to a screen reader and invisible to ' +
        'search engines.',
      validation: (rule) =>
        rule
          .required()
          .error(
            'Upload the file, or delete this row — otherwise the product page shows a ' +
              'download link that downloads nothing.',
          ),
    }),
  ],

  preview: {
    select: { title: 'title', kind: 'kind', filename: 'file.asset.originalFilename' },
    prepare({ title, kind, filename }) {
      return {
        title: title || filename || 'Untitled download',
        subtitle: [kind, filename].filter(Boolean).join(' · ') || 'No file yet',
        media: DownloadIcon,
      }
    },
  },
})
