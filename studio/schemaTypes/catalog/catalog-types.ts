import type { SingletonDefinition } from '../../document-types'

/** The catalogue archetype's names, in one file.
 *
 * Same reasoning as `studio/document-types.ts`: a schema type name is a string,
 * strings drift, and a drifted string in a reference filter or a structure pane
 * fails *silently* — the picker simply offers nothing and nobody finds out until
 * a client says "I can't add a specification any more".
 *
 * It is also what makes the archetype removable. Everything in `catalog/`
 * imports from here; nothing outside `catalog/` does, apart from the handful of
 * wiring lines listed in the module's README note. Delete the directory and
 * those lines and there is nothing left in the Studio that mentions a product.
 */
export const CATALOG_TYPE = {
  /** One thing in the catalogue. Browsed and enquired about, never bought. */
  product: 'product',
  /** Where a product sits in the catalogue. Two levels deep, no more. */
  productCategory: 'productCategory',
  /** One row of the specification table, defined once for the whole site. */
  productAttribute: 'productAttribute',
  /** One allowed answer to a specification whose answers are a fixed list. */
  productAttributeOption: 'productAttributeOption',
  /** Where enquiries go, and the words around the form. One per site. */
  enquirySettings: 'enquirySettings',
} as const

/** Spread into `SINGLETONS` in `studio/document-types.ts`.
 *
 * Enquiry routing is one answer for the whole site — the same address receives
 * an enquiry raised from any of five hundred product pages — so it is a
 * singleton by the test in `documents/site-settings.ts`: would changing it
 * change every page? It would.
 */
export const CATALOG_SINGLETONS = [
  { type: CATALOG_TYPE.enquirySettings, title: 'Enquiries' },
] as const satisfies readonly SingletonDefinition[]

/** The third tab `product` adds to the two in `shared/field-groups.ts`.
 *
 * A product form is long — identity, category, images, prose, specifications,
 * variants, downloads — and the specification table is the part a B2B editor
 * opens the document to change. It gets its own tab so it is one click from the
 * top of the form rather than four screens down it.
 */
export const CATALOG_FIELD_GROUP = {
  specifications: 'specifications',
} as const

/** The three kinds of specification value, and everything that follows.
 *
 * ## Why a specification has a *kind* at all
 *
 * A specification table is the defining feature of a B2B catalogue and the
 * easiest thing in this schema to model badly. There are two failure modes and
 * both are expensive:
 *
 *   **A free-text blob** (`specifications: text`) is unqueryable. Nobody can
 *   filter by voltage, nobody can sort by weight, nobody can compare two
 *   products, and "12V", "12 V" and "12 volts" are three different products'
 *   worth of the same fact. It also cannot be imported into or exported out of
 *   the client's ERP, which is where the data actually lives.
 *
 *   **A fixed field set** (`voltage`, `weight`, `material` as columns on
 *   `product`) works beautifully for the first client and not at all for the
 *   second, whose products have shelf lives and allergens. Every new client is
 *   a schema fork, and every fork is a starter that has stopped being one.
 *
 * So specifications are entity–attribute–value: the *rows* of the table are
 * documents (`productAttribute`) defined once per site, and a product holds
 * *values* against them. The client's own vocabulary lives in content, where
 * they can extend it, and the shape of it lives in code, where it stays
 * queryable.
 *
 * ## Why three kinds and not one
 *
 * Because a value that is a number and a value that is one of a fixed list are
 * different things to everything downstream. A number sorts, ranges and gets a
 * unit; an option facets (`?material=stainless-steel`) and must be spelled
 * identically on every product that has it, which only a controlled list can
 * guarantee; text does neither and is the escape hatch.
 *
 * One row type with three optional value fields was the alternative. It shows
 * every editor three boxes for every row and can only catch the wrong one being
 * filled in *after* they have filled it in. Three row types let the attribute
 * picker be filtered at the moment of picking (`valueType == $valueType`), so
 * the wrong pairing is not something an editor can build.
 *
 * This table is the single source of that pairing. It builds the radio list on
 * `productAttribute`, the filter on each row's reference field, and the wording
 * of the message when the two drift apart.
 */
export const SPECIFICATION_KINDS = [
  {
    /** Stored on `productAttribute.valueType`. */
    valueType: 'number',
    /** The array member type a product uses to record one. */
    rowType: 'productSpecMeasurement',
    /** What the row is called in the insert menu and in messages. */
    label: 'Measurement',
    /** How the choice reads on the attribute's radio list. */
    choice: 'A number — a weight, a length, a voltage, a shelf life',
  },
  {
    valueType: 'choice',
    rowType: 'productSpecOption',
    label: 'Option',
    choice: 'One or more answers from a list you control — a material, a certification',
  },
  {
    valueType: 'text',
    rowType: 'productSpecText',
    label: 'Text',
    choice: 'A few words, written freely — only when neither of the above fits',
  },
] as const

export type SpecificationKind = (typeof SPECIFICATION_KINDS)[number]
export type SpecificationValueType = SpecificationKind['valueType']

/** The kind a stored `valueType` refers to, or `undefined` for a value written
 *  before this list had it. Callers treat `undefined` as "do not complain": a
 *  validator that fires on data it does not understand is a validator an editor
 *  cannot satisfy. */
export function specificationKind(valueType: unknown): SpecificationKind | undefined {
  return SPECIFICATION_KINDS.find((kind) => kind.valueType === valueType)
}

/** Initial-value templates this archetype registers in `sanity.config.ts`.
 *
 * One entry, and it exists to solve a real editor problem rather than to be
 * thorough: an allowed answer is meaningless without the specification it
 * belongs to, so the "Add" button inside a specification's Options pane has to
 * arrive with that specification already filled in. Without it the field is
 * `disableNew: true` and the client has no way to add "Titanium" at all.
 */
export const CATALOG_TEMPLATE = {
  attributeOption: 'productAttributeOption-byAttribute',
} as const
