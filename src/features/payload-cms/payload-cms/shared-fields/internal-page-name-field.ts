import type { Field } from 'payload';

/**
 *
 * This field is used to store the name of a page for internal purposes. We need to add
 * this field as payload does not allow to use a non-top-level field as a title field and
 * default sort order.
 *
 * Thus we need to add this field to the collection to be able to use it as a title field
 * and default sort order. This field should be added as the first field in the collection.
 *
 * TODO: the internal page name should be unique within a collection. We should add a
 *    validation to enforce this.
 *
 */
export const internalPageNameField: Field = {
  name: 'internalPageName',
  type: 'text',
  label: {
    en: 'Internal Page Name',
    de: 'Interner Seitenname',
    fr: 'Nom de la page interne',
  },
  required: true,
  // the internal page name should not be localized,
  // as it is used for internal purposes and should be the same in all locales
  // to uniquely identify the page within a collection
  localized: false,
  admin: {
    position: 'sidebar',
    description: {
      de: 'Bezeichnung der Seite für interne Zwecke.',
      en: 'Name of the page for internal purposes.',
      fr: 'Nom de la page à des fins internes.',
    },
  },
};
