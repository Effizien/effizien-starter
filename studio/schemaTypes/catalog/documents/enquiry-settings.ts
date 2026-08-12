import { EnvelopeIcon } from '@sanity/icons/Envelope'
import { defineField, defineType } from 'sanity'

import { DOCUMENT_TYPE } from '../../../document-types'
import { CATALOG_LIMIT } from '../catalog-limits'
import { CATALOG_TYPE } from '../catalog-types'

/** The enquiry path, from the button on a product page to the address it lands
 *  at. A singleton — see `CATALOG_SINGLETONS` in `catalog-types.ts`.
 *
 * ## What an enquiry is, in a catalogue with no checkout
 *
 * A visitor collects products (and variants) as they browse, opens the enquiry
 * page, says who they are and what they want, and sales receives an email. The
 * list itself lives in the browser, not in Sanity: it is one visitor's session,
 * it changes every few seconds, and writing it to a CMS would need a write token
 * in the browser — which is a credential, not a feature. The frontend keeps
 * article numbers and re-reads names from Sanity when it renders, so a product
 * renamed while somebody was browsing does not send sales a stale name.
 *
 * ## Why there is no `enquiry` document type
 *
 * Submissions are not content, and this is the one place in the archetype where
 * that distinction is worth money rather than tidiness:
 *
 *   - They are personal data. A Sanity dataset is readable by every editor and
 *     by every read token, has no field-level permissions, and keeps document
 *     history — so an erasure request cannot actually be honoured by deleting
 *     the document.
 *   - There is no retention policy a CMS can express, and "we kept every enquiry
 *     forever because that is where the CMS put them" is a bad sentence to have
 *     to say to a regulator.
 *   - The client already has a system for leads. It is their inbox, and usually
 *     a CRM behind it. A second half-built one in the Studio gets checked for
 *     three weeks and then never again.
 *
 * So the route handler validates the submission, sends it, and stores nothing.
 * If a client wants enquiries logged, that is a CRM webhook — a decision with an
 * ADR, not a document type.
 *
 * ## Why the recipient is content and not an environment variable
 *
 * It is not a secret, and it is the single most likely thing to change after
 * handover: a salesperson leaves, an address changes, a client wants enquiries
 * split by season. As an environment variable, each of those is a developer, a
 * deploy and an invoice. It is required and format-checked here because the
 * failure mode — enquiries going nowhere, silently — looks exactly like no
 * enquiries at all.
 */
export const enquirySettings = defineType({
  name: CATALOG_TYPE.enquirySettings,
  title: 'Enquiries',
  type: 'document',
  icon: EnvelopeIcon,

  fields: [
    defineField({
      name: 'recipientEmail',
      title: 'Send enquiries to',
      type: 'string',
      description:
        'Every enquiry raised anywhere on the site arrives at this address. Use a ' +
        'shared inbox rather than one person’s — an address that stops being read ' +
        'when somebody is on holiday is the same as no address at all.',
      validation: (rule) => [
        rule
          .required()
          .error(
            'Enquiries need somewhere to go. Without this the form still submits and ' +
              'the visitor still sees a thank-you message, and nobody receives anything.',
          ),
        rule
          .email()
          .error('This does not look like an email address — check it for a typo.'),
      ],
    }),

    defineField({
      name: 'enquiryPage',
      title: 'Enquiry page',
      type: 'reference',
      to: [{ type: DOCUMENT_TYPE.page }],
      description:
        'The page holding the enquiry form — the one with an "Enquiry form" section ' +
        'on it. Every "Add to enquiry" button on the site sends people here.',
      options: { disableNew: true },
      validation: (rule) =>
        rule
          .required()
          .warning(
            'Until a page is chosen, the enquiry buttons on the product pages have ' +
              'nowhere to send anyone. Create a page, add an "Enquiry form" section to ' +
              'it, and choose it here.',
          ),
    }),

    defineField({
      name: 'actionLabel',
      title: 'Wording on the enquiry button',
      type: 'string',
      initialValue: 'Add to enquiry',
      description:
        'The words on the button that appears on every product — "Add to enquiry", ' +
        '"Request a quote", "Ask for a sample". Say what the visitor gets; this is the ' +
        'one thing the whole catalogue is asking them to do.',
      validation: (rule) => [
        rule
          .required()
          .error(
            'The enquiry button needs wording. Empty, it renders as a button with no ' +
              'label — clickable, and announced by a screen reader as "button" and ' +
              'nothing else.',
          ),
        rule
          .max(CATALOG_LIMIT.actionLabel)
          .warning(
            `Past ${CATALOG_LIMIT.actionLabel} characters this wraps onto two lines on ` +
              'a product card. Two or three words is right.',
          ),
      ],
    }),

    defineField({
      name: 'intro',
      title: 'Introduction to the form',
      type: 'simpleRichText',
      description:
        'Optional, shown above the form. Worth one sentence about what happens next ' +
        'and how quickly — "We answer enquiries within one working day" removes more ' +
        'hesitation than anything else on the page.',
    }),

    defineField({
      name: 'privacyNotice',
      title: 'Privacy notice',
      type: 'simpleRichText',
      description:
        'Shown next to the submit button. Say what happens to the details someone ' +
        'enters and link to your privacy policy — a form collecting a name, a company ' +
        'and an email address is collecting personal data, and this is not optional.',
      validation: (rule) =>
        rule
          .required()
          .error(
            'The form collects a name, an email address and a phone number, so it ' +
              'needs a privacy notice with a link to your privacy policy beside it. ' +
              'This is a legal requirement, not a nicety.',
          ),
    }),

    defineField({
      name: 'successMessage',
      title: 'Message after sending',
      type: 'text',
      rows: 3,
      initialValue:
        'Thank you — your enquiry is on its way. We will come back to you within one working day.',
      description:
        'What the visitor sees once the enquiry has been sent. Confirm it arrived and ' +
        'say when they will hear back; silence after a submit button is what makes ' +
        'people submit twice.',
      validation: (rule) => [
        rule
          .required()
          .error(
            'Without this, the form empties itself and says nothing — which reads as a ' +
              'failure, and most people send the enquiry again.',
          ),
        rule
          .max(CATALOG_LIMIT.successMessage)
          .warning(
            'Two sentences is plenty. Nobody reads a paragraph after they have already ' +
              'done the thing.',
          ),
      ],
    }),
  ],

  preview: {
    select: { recipient: 'recipientEmail', page: 'enquiryPage.title' },
    prepare({ recipient, page }) {
      return {
        title: 'Enquiries',
        subtitle: [
          recipient ? `to ${recipient}` : 'No recipient — enquiries go nowhere',
          page ? `form on "${page}"` : 'no form page chosen',
        ].join(' · '),
        media: EnvelopeIcon,
      }
    },
  },
})
