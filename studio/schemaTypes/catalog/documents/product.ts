import { PackageIcon } from '@sanity/icons/Package'
import { defineArrayMember, defineField, defineType, getPublishedId } from 'sanity'
import { seoField } from '../../objects/seo'
import { FIELD_GROUP } from '../../shared/field-groups'
import { slugField } from '../../shared/slug-field'
import { hasText, isValueUniqueAcrossDocuments } from '../../shared/validation'
import { CATALOG_LIMIT } from '../catalog-limits'
import { CATALOG_ROUTE } from '../catalog-routes'
import { CATALOG_FIELD_GROUP, CATALOG_TYPE } from '../catalog-types'
import { describeDuplicateArticleNumbers } from '../objects/product-variant'
import { specificationsField } from '../shared/specification-fields'

/** One thing in the catalogue: browsed, compared, enquired about. Never bought.
 *
 * That last sentence is a locked decision (the "Talpa Taste" pattern), and it is
 * visible in what this type does *not* have. No price, no stock, no tax class,
 * no currency, no shipping weight-as-a-first-class-field. Adding any of them
 * halfway is how a catalogue becomes a shop nobody decided to build: the fields
 * appear, the client fills them in, and six months later somebody asks why there
 * is no basket. If a client needs prices, that is a decision with an ADR and a
 * revisit trigger, not a field somebody adds on a Friday.
 *
 * ## The fixed field set stops here
 *
 * Everything above `specifications` is true of every product in every catalogue:
 * it has a name, an address, a code, a place in the catalogue, a photograph, a
 * sentence, a paragraph. Everything a *particular* client's products have —
 * voltage, shelf life, thread size, allergens, minimum order quantity, lead time
 * — is a specification, defined in content by the client. That line is the whole
 * design, and the reason this type survives the second client without a fork.
 *
 * ## No page builder
 *
 * Deliberate, and the page-builder rules say it outright: rigid, formulaic
 * content does not want one. A product page is the same shape every time, which
 * is exactly what makes two hundred of them comparable. Give it sections and
 * within a year some products have an FAQ and some do not, the specification
 * table is in a different place on each, and the client is laying out pages one
 * at a time — which is the job the catalogue existed to avoid.
 *
 * ## Managing five hundred of them
 *
 * The Studio side of that question is answered in `catalog-structure.ts` (browse
 * by category, sort by name, one pane per concern). The schema side is here: the
 * article number is unique and required, so an import can find and update an
 * existing product by it rather than creating a second one — `_id` values are
 * implementation detail and slugs change, which is why neither is the key
 * (schema rules §6). The preview shows the article number and the category,
 * because those are what tell two products called "Adapter plate" apart.
 */
export const product = defineType({
  name: CATALOG_TYPE.product,
  title: 'Product',
  type: 'document',
  icon: PackageIcon,

  /* Written out rather than spread from `DOCUMENT_FIELD_GROUPS` because the
     order matters: specifications are what an editor opens a product to change,
     so the tab sits between the words and the search settings rather than after
     both. The names still come from the shared constants, so a rename there
     stays a compile error here. */
  groups: [
    { name: FIELD_GROUP.content, title: 'Content', default: true },
    { name: CATALOG_FIELD_GROUP.specifications, title: 'Specifications' },
    { name: FIELD_GROUP.seo, title: 'SEO & sharing' },
  ],

  fields: [
    defineField({
      name: 'title',
      title: 'Product name',
      type: 'string',
      group: FIELD_GROUP.content,
      description:
        'What this product is called, as a buyer would say it. Leave the article ' +
        'number out of it — it has a field of its own and is shown alongside.',
      validation: (rule) => [
        rule
          .required()
          .error(
            'Every product needs a name. Without one it appears as "Untitled" in the ' +
              'catalogue, in search results, in this list, and in any enquiry raised ' +
              'against it.',
          ),
        rule
          .max(CATALOG_LIMIT.productName)
          .warning(
            `Past about ${CATALOG_LIMIT.productName} characters this is cut off in ` +
              'search results and wraps over three lines on a product card. If the long ' +
              'form matters, put it in the description and keep the name short.',
          ),
      ],
    }),

    slugField({
      group: FIELD_GROUP.content,
      pathFor: CATALOG_ROUTE.product,
      /* Products and categories share one URL namespace — see
         `catalog-routes.ts`. Without this, a category called "Valves" and a
         product called "Valves" would both publish and one would quietly become
         unreachable. */
      uniqueWithin: [CATALOG_TYPE.product, CATALOG_TYPE.productCategory],
    }),

    defineField({
      name: 'articleNumber',
      title: 'Article number',
      type: 'string',
      group: FIELD_GROUP.content,
      description:
        'Your own code for this product. It is shown on the product page, carried ' +
        'into every enquiry, and used to match this product when the catalogue is ' +
        'updated from a spreadsheet — so it has to be exactly what your systems use, ' +
        'and it has to stay put.',
      validation: (rule) => [
        rule
          .required()
          .error(
            'Every product needs an article number. It is the only thing that ties an ' +
              'enquiry to a line in your own system, and the only stable way to update ' +
              'this product from an import — a name or a web address can change, this ' +
              'cannot.',
          ),

        rule.custom((value) => {
          if (!hasText(value)) return true
          if (value === value.trim()) return true
          return 'Remove the spaces at the start or end. They travel into enquiries and exports, where they stop the code matching.'
        }),

        rule.custom(async (value, context) => {
          if (!hasText(value)) return true

          const unique = await isValueUniqueAcrossDocuments(
            value,
            { fieldPath: 'articleNumber', types: [CATALOG_TYPE.product] },
            context,
          )

          return (
            unique ||
            `Another product already uses the article number "${value}". An enquiry ` +
              'carries the code and nothing else, so sales would have no way of telling ' +
              'which product a customer meant — and the next import would overwrite one ' +
              'of the two.'
          )
        }),

        rule
          .max(CATALOG_LIMIT.articleNumber)
          .warning(
            `Over ${CATALOG_LIMIT.articleNumber} characters this is probably a ` +
              'description that has been pasted into the wrong box.',
          ),
      ],
    }),

    defineField({
      name: 'category',
      title: 'Category',
      type: 'reference',
      group: FIELD_GROUP.content,
      to: [{ type: CATALOG_TYPE.productCategory }],
      description:
        'Where this sits in the catalogue. It decides the breadcrumb, which category ' +
        'page lists it, and which specifications are offered below — so it is worth ' +
        'setting before you fill the specification table in.',
      options: { disableNew: true },
      validation: (rule) =>
        rule
          .required()
          .error(
            'Choose a category. A product with none is reachable only by its direct ' +
              'address: it appears on no category page, in no breadcrumb, and in no ' +
              'filtered result.',
          ),
    }),

    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      group: FIELD_GROUP.content,
      initialValue: 'current',
      options: {
        layout: 'radio',
        list: [
          { title: 'Current — in the catalogue and open to enquiries', value: 'current' },
          {
            title: 'Discontinued — kept online, marked, not enquirable',
            value: 'discontinued',
          },
        ],
      },
      description:
        'Mark a product discontinued rather than deleting it. The page stays where it ' +
        'is, so every link, bookmark and search result still works, and anyone who ' +
        'arrives is told it is discontinued and pointed at what replaced it. Deleting ' +
        'it instead turns all of that traffic into "page not found".',
    }),

    defineField({
      name: 'replacedBy',
      title: 'Replaced by',
      type: 'reference',
      group: FIELD_GROUP.content,
      to: [{ type: CATALOG_TYPE.product }],
      hidden: ({ parent }) =>
        (parent as { status?: string } | undefined)?.status !== 'discontinued',
      description:
        'The product a customer should look at instead. This is the single most ' +
        'valuable thing on a discontinued page — someone has arrived from an old ' +
        'datasheet or an old order, and this is what stops them leaving.',
      options: {
        disableNew: true,
        filter: ({ document }) => {
          const id = getPublishedId(document?._id ?? '')
          return {
            filter: 'status != "discontinued" && !(_id in $self)',
            params: { self: id ? [id, `drafts.${id}`] : [] },
          }
        },
      },
      validation: (rule) =>
        rule
          .custom((value, context) => {
            const status = (context.document as { status?: string } | undefined)?.status
            if (status !== 'discontinued' || value) return true
            return (
              'Nothing is named as a replacement. Anyone arriving from an old link or ' +
              'an old datasheet reaches a dead end and leaves — naming the nearest ' +
              'equivalent turns that visit into an enquiry.'
            )
          })
          .warning(),
    }),

    defineField({
      name: 'summary',
      title: 'Short description',
      type: 'text',
      rows: 3,
      group: FIELD_GROUP.content,
      description:
        'One or two sentences: what it is and who it is for. This is the line under ' +
        'the product everywhere it is listed, and the description search engines use ' +
        'when the SEO tab is empty — so write it for someone who has not seen the page.',
      validation: (rule) => [
        rule
          .required()
          .warning(
            'Without this, the product appears in listings as a name and a picture, ' +
              'and search engines write their own snippet out of whatever text they ' +
              'find on the page.',
          ),
        rule
          .max(CATALOG_LIMIT.summary)
          .warning(
            `Over ${CATALOG_LIMIT.summary} characters this is cut off on the product ` +
              'card and in search results. The full explanation goes in the description ' +
              'below.',
          ),
      ],
    }),

    defineField({
      name: 'images',
      title: 'Photographs',
      type: 'array',
      group: FIELD_GROUP.content,
      of: [defineArrayMember({ type: 'mediaImage' })],
      description:
        'Drag to reorder. The first one is used on cards, in search results and when ' +
        'the page is shared, so put the clearest whole-product shot first.',
      validation: (rule) => [
        rule
          .min(1)
          .warning(
            'A product with no photograph gets a fraction of the enquiries of one with ' +
              'a photograph. If the picture does not exist yet, this is worth chasing.',
          ),
        rule
          .max(CATALOG_LIMIT.images)
          .warning(
            `Past ${CATALOG_LIMIT.images} photographs the gallery is an archive rather ` +
              'than a set of views. Keep the ones that show something different.',
          ),
      ],
    }),

    defineField({
      name: 'description',
      title: 'Description',
      type: 'richText',
      group: FIELD_GROUP.content,
      description:
        'The full explanation: what it does, what it is made for, what to consider ' +
        'when choosing it. Facts and figures belong in the specification table, not ' +
        'in here — a table can be filtered and compared, a paragraph cannot.',
    }),

    defineField({
      name: 'downloads',
      title: 'Downloads',
      type: 'array',
      group: FIELD_GROUP.content,
      of: [defineArrayMember({ type: 'productDownload' })],
      description:
        'Datasheets, certificates, manuals. In a catalogue where nobody checks out, ' +
        'the download is often what the visit was for.',
      validation: (rule) =>
        rule
          .max(CATALOG_LIMIT.downloads)
          .warning(
            `Past ${CATALOG_LIMIT.downloads} files this is a document library rather ` +
              'than a product page. Keep the current versions here and put the archive ' +
              'behind a link.',
          ),
    }),

    specificationsField({
      group: CATALOG_FIELD_GROUP.specifications,
      description:
        'The specification table, in the order it should be read — put the figures ' +
        'buyers choose on at the top. Add a Measurement for a number, an Option for ' +
        'an answer from a list, and Text only when neither fits. Each kind offers the ' +
        'specifications defined for it; if the one you want is missing, it is defined ' +
        'as a different kind under Catalogue → Specifications.',
    }),

    defineField({
      name: 'variants',
      title: 'Variants',
      type: 'array',
      group: CATALOG_FIELD_GROUP.specifications,
      of: [defineArrayMember({ type: 'productVariant' })],
      description:
        'Sizes, pack sizes, finishes — the same product with its own article number. ' +
        'Leave this empty if there is only one of it. A variant is not a separate ' +
        'product: it has no page of its own, and an enquiry names it by its article ' +
        'number.',
      validation: (rule) => [
        rule.custom(describeDuplicateArticleNumbers),
        rule
          .max(CATALOG_LIMIT.variants)
          .warning(
            `Past ${CATALOG_LIMIT.variants} variants the list on the product page is ` +
              'longer than the page. If they differ in more than a size, they are ' +
              'probably several products.',
          ),
      ],
    }),

    seoField(),
  ],

  orderings: [
    {
      name: 'titleAscending',
      title: 'Name, A–Z',
      by: [{ field: 'title', direction: 'asc' }],
    },
    {
      name: 'articleNumberAscending',
      title: 'Article number',
      by: [{ field: 'articleNumber', direction: 'asc' }],
    },
    {
      name: 'recentlyUpdated',
      title: 'Recently updated',
      by: [{ field: '_updatedAt', direction: 'desc' }],
    },
  ],

  preview: {
    select: {
      title: 'title',
      articleNumber: 'articleNumber',
      category: 'category.title',
      status: 'status',
      media: 'images.0',
    },
    prepare({ title, articleNumber, category, status, media }) {
      return {
        title: title || 'Untitled product',
        subtitle: [
          articleNumber || 'No article number',
          category || 'Not filed',
          status === 'discontinued' ? 'Discontinued' : null,
        ]
          .filter(Boolean)
          .join(' · '),
        media: media ?? PackageIcon,
      }
    },
  },
})
