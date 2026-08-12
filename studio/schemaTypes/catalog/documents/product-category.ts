import { FolderIcon } from '@sanity/icons/Folder'
import { defineField, defineType, getPublishedId } from 'sanity'
import { seoField } from '../../objects/seo'
import { DOCUMENT_FIELD_GROUPS, FIELD_GROUP } from '../../shared/field-groups'
import { slugField } from '../../shared/slug-field'
import { STUDIO_API_VERSION } from '../../shared/validation'
import { CATALOG_LIMIT } from '../catalog-limits'
import { CATALOG_ROUTE } from '../catalog-routes'
import { CATALOG_TYPE } from '../catalog-types'

/** Where a product sits in the catalogue, and a landing page of its own.
 *
 * A category is not only a filter. On a B2B site it is usually the page that
 * ranks — "stainless steel ball valves" is what a buyer searches for, and a
 * page that answers it with an introduction and a grid of products is worth more
 * than any individual product page. Hence the slug, the introduction and the SEO
 * object: this is a real page, not a label.
 *
 * ## Two levels, enforced where it can be enforced
 *
 * The picker for "Sits inside" only offers categories that are themselves
 * top-level, so a third level is not something an editor can build — the same
 * technique `navigationGroup` uses to stop menus nesting. Validation repeats the
 * rule for content that arrived by import rather than by typing.
 *
 * Deeper trees are a phone-sized problem: a fourth-level category is four taps
 * from the catalogue and its products are unreachable from anywhere a visitor
 * would look. A client who genuinely has that much structure has a filter
 * problem, not a hierarchy problem, and the specification filters are the answer.
 *
 * ## No page builder
 *
 * A category page is a fixed shape — introduction, product grid, subcategories —
 * and the page-builder rules say as much: rigid, formulaic content does not want
 * one. Adding it later is additive; taking it away once a client has built
 * thirty category pages out of sections is not.
 *
 * ## No manual sort order
 *
 * Categories list alphabetically. A `sortOrder` number is the usual answer and
 * it is the worst editing experience in any CMS — renumbering ten rows to move
 * one. If a client needs a deliberate order, that is a decision worth an ADR:
 * either the ordered-document-list plugin (a dependency, so it needs
 * justifying) or an ordered array on a settings singleton.
 */
export const productCategory = defineType({
  name: CATALOG_TYPE.productCategory,
  title: 'Product category',
  type: 'document',
  icon: FolderIcon,

  groups: DOCUMENT_FIELD_GROUPS,

  fields: [
    defineField({
      name: 'title',
      title: 'Category name',
      type: 'string',
      group: FIELD_GROUP.content,
      description:
        'What buyers call this group of products, not what your catalogue calls it. ' +
        'This is the page heading, the breadcrumb, and the wording in every menu that ' +
        'links here.',
      validation: (rule) => [
        rule
          .required()
          .error(
            'Every category needs a name. Without one it appears as "Untitled" in the ' +
              'catalogue, in breadcrumbs, and in the picker on every product form.',
          ),
        rule
          .max(CATALOG_LIMIT.productName)
          .warning(
            'A category name this long wraps in breadcrumbs and in the filter list. ' +
              'Two or three words is usually right.',
          ),
      ],
    }),

    /* Products and categories share `/products/…`, so they compete for one
       address — see `catalog-routes.ts`. `uniqueWithin` is what turns that
       competition into a message rather than a page that silently stops being
       reachable. */
    slugField({
      group: FIELD_GROUP.content,
      pathFor: CATALOG_ROUTE.category,
      uniqueWithin: [CATALOG_TYPE.productCategory, CATALOG_TYPE.product],
    }),

    defineField({
      name: 'parent',
      title: 'Sits inside',
      type: 'reference',
      group: FIELD_GROUP.content,
      to: [{ type: CATALOG_TYPE.productCategory }],
      description:
        'Optional. Leave it empty for a top-level category. The list only offers ' +
        'top-level categories, because the catalogue goes two levels deep and no ' +
        'further.',
      options: {
        disableNew: true,
        filter: ({ document }) => {
          const id = getPublishedId(document?._id ?? '')
          return {
            /* Top-level only (so the tree cannot grow a third level) and never
               this document itself, in either its draft or published form. */
            filter: '!defined(parent) && !(_id in $self)',
            params: { self: id ? [id, `drafts.${id}`] : [] },
          }
        },
      },
      validation: (rule) => [
        rule.custom((value, context) => {
          const ref = (value as { _ref?: string } | undefined)?._ref
          if (!ref) return true
          if (ref !== getPublishedId(context.document?._id ?? '')) return true
          return 'A category cannot sit inside itself. Leave this empty to make it top-level.'
        }),

        rule.custom(async (value, context) => {
          const ref = (value as { _ref?: string } | undefined)?._ref
          if (!ref) return true

          const client = context.getClient({ apiVersion: STUDIO_API_VERSION })
          const grandparent = await client.fetch<{ title?: string | null } | null>(
            '*[_id == $id][0].parent->{title}',
            { id: ref },
          )

          if (!grandparent) return true

          return (
            `That category already sits inside "${grandparent.title ?? 'another category'}", ` +
            `so putting this one under it would make ${CATALOG_LIMIT.categoryDepth + 1} ` +
            'levels. The catalogue goes two deep — anything further is unreachable on a ' +
            'phone. Use the specification filters to narrow within a category instead.'
          )
        }),
      ],
    }),

    defineField({
      name: 'intro',
      title: 'Introduction',
      type: 'richText',
      group: FIELD_GROUP.content,
      description:
        'Shown above the products. This is the text that makes a category page worth ' +
        'finding in a search — what the range is for, who buys it, what to consider ' +
        'when choosing. A page that is only a grid of thumbnails has nothing for a ' +
        'search engine to read.',
    }),

    defineField({
      name: 'image',
      title: 'Photograph',
      type: 'mediaImage',
      group: FIELD_GROUP.content,
      description:
        'Optional. Used on the category card in the catalogue. Use images on all ' +
        'categories or none — a grid where half have pictures looks unfinished.',
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
      name: 'recentlyUpdated',
      title: 'Recently updated',
      by: [{ field: '_updatedAt', direction: 'desc' }],
    },
  ],

  preview: {
    select: {
      title: 'title',
      path: 'slug.current',
      parent: 'parent.title',
      media: 'image',
    },
    prepare({ title, path, parent, media }) {
      return {
        title: title || 'Untitled category',
        subtitle: path
          ? [parent ? `in ${parent}` : 'Top level', `/products/${path}`].join(' · ')
          : 'No web address yet — cannot be published',
        media: media ?? FolderIcon,
      }
    },
  },
})
