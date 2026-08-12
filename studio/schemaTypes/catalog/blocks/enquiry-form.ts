import { EnvelopeIcon } from '@sanity/icons/Envelope'
import { defineType } from 'sanity'

import { sectionFields } from '../../shared/section-fields'
import { previewText } from '../../shared/section-preview'

/** Where the enquiry form appears.
 *
 * Almost empty, and that is the design. Everything the form *does* — who it goes
 * to, the privacy notice, the message afterwards — is one answer for the whole
 * site and lives in the Enquiries singleton. What is left is a placement, plus
 * the optional heading and introduction every section in the library has.
 *
 * ## Why a section rather than a fixed `/enquiry` route
 *
 * A fixed route would be less wiring and would take the page away from the
 * client. As an ordinary `page` with this section on it, the enquiry page has an
 * address they choose, can be linked to from a menu like anything else, can be
 * previewed, and can carry a paragraph about lead times above the form and a
 * phone number below it. None of that would be reachable without a developer if
 * the page were a route.
 *
 * ## No fields for the form itself
 *
 * There is no field list, no "add a question", no required-flag per field. A form
 * builder inside a CMS is a project rather than a feature: every field needs
 * validation, an accessible label, an error message, a place in the email, and a
 * matching change in the route handler that sends it. The fields are the ones
 * sales needs to answer an enquiry — name, company, email, telephone, message,
 * plus the products collected while browsing — and they live in the route
 * handler where they are typed and tested. A client who needs a sixth field
 * needs a developer for an hour, which is the honest price.
 */
export const enquiryForm = defineType({
  name: 'enquiryForm',
  title: 'Enquiry form',
  type: 'object',
  icon: EnvelopeIcon,
  fields: [...sectionFields],
  preview: {
    select: { heading: 'heading', intro: 'intro' },
    prepare({ heading, intro }) {
      return {
        title: previewText(heading) || previewText(intro) || 'Enquiry form',
        subtitle: 'Enquiry form · settings under Enquiries',
        media: EnvelopeIcon,
      }
    },
  },
})
