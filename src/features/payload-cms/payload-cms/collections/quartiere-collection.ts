import {
  hasAdminOrWebAccess,
  isEditor,
} from '@/features/payload-cms/payload-cms/access-rules/roles';
import { AdminPanelDashboardGroups } from '@/features/payload-cms/payload-cms/admin-panel-dashboard-groups';
import {
  flushPageCacheOnChange,
  flushPageCacheOnDelete,
} from '@/features/payload-cms/payload-cms/utils/flush-page-cache-on-change';
import { getValidationMessage } from '@/features/payload-cms/payload-cms/utils/validation-messages';
import type { CollectionConfig, NumberFieldSingleValidation } from 'payload';

/**
 * A Quartier is "Q5" on every chip and its icon follows the number, so it is a whole number from
 * 1. A custom `validate` drops the built-in `required` and `min` checks, so it makes them too.
 */
const validateQuartierNumber: NumberFieldSingleValidation = (value, { req }) => {
  if (typeof value === 'number' && Number.isInteger(value) && value >= 1) return true;
  return getValidationMessage(req.i18n.language, {
    en: 'Must be a whole number from 1, e.g. 5.',
    de: 'Muss eine ganze Zahl ab 1 sein, z.B. 5.',
    fr: 'Doit être un nombre entier à partir de 1, par ex. 5.',
  });
};

/**
 * The Quartiere of the campsite. A Quartier groups several Höfe: each Hof names its Quartier,
 * and the Quartier lists the Höfe that do.
 *
 * Unlike the Höfe, which come from Cevi.DB, the Quartiere are laid out by the camp and kept
 * here by hand. Where a Quartier lies is drawn once on the camp map and linked, so the map
 * stays the one place for geography.
 */
export const QuartiereCollection: CollectionConfig = {
  slug: 'quartiere',
  typescript: { interface: 'Quartier' },
  // A document that links a Quartier needs its name, number and Rufname. Without this, the link
  // would also carry the joined Höfe to every reader, e.g. to the programme of all participants.
  defaultPopulate: { name: true, number: true, rufname: true },
  // the cached Karte and Programm show the names, so a renamed Quartier has to reach them
  hooks: { afterChange: [flushPageCacheOnChange], afterDelete: [flushPageCacheOnDelete] },
  labels: {
    singular: { en: 'Quartier', de: 'Quartier', fr: 'Quartier' },
    plural: { en: 'Quartiers', de: 'Quartiere', fr: 'Quartiers' },
  },
  admin: {
    useAsTitle: 'name',
    group: AdminPanelDashboardGroups.AppCampsite.label,
    defaultColumns: ['number', 'name', 'rufname', 'mapAnnotation', 'hoefe'],
    description: {
      en: 'The Quartiere of the campsite. Assign a Hof to its Quartier on the Hof.',
      de: 'Die Quartiere des Lagerplatzes. Einem Hof wird sein Quartier auf dem Hof zugewiesen.',
      fr: 'Les quartiers du terrain de camp. Un Hof est attribué à son quartier sur le Hof.',
    },
  },
  defaultSort: 'number',
  access: {
    // the names reach every participant through the chat address book, which reads them
    // server-side; the collection itself is for the editors
    read: isEditor,
    create: hasAdminOrWebAccess,
    update: hasAdminOrWebAccess,
    // a Hof that points at a deleted Quartier simply has none again
    delete: hasAdminOrWebAccess,
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      unique: true,
      label: { en: 'Name', de: 'Name', fr: 'Nom' },
      admin: {
        description: {
          en: 'The full name, shown next to the Hof, e.g. "Quartier 5 - Greif".',
          de: 'Der volle Name, wird neben dem Hof angezeigt, z.B. "Quartier 5 - Greif".',
          fr: 'Le nom complet, affiché à côté du Hof, par ex. « Quartier 5 - Greif ».',
        },
      },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'number',
          type: 'number',
          required: true,
          unique: true,
          min: 1,
          validate: validateQuartierNumber,
          label: { en: 'Number', de: 'Nummer', fr: 'Numéro' },
          admin: {
            width: '30%',
            step: 1,
            description: {
              en: 'Shown as "Q5" on chips; it also picks the Quartier\'s icon and colour in the app.',
              de: 'Erscheint als "Q5" auf den Chips und bestimmt in der App Icon und Farbe des Quartiers.',
              fr: "Affiché comme « Q5 » sur les puces ; il détermine aussi l'icône et la couleur du quartier dans l'app.",
            },
          },
        },
        {
          name: 'rufname',
          type: 'text',
          label: { en: 'Rufname', de: 'Rufname', fr: 'Rufname' },
          admin: {
            width: '70%',
            description: {
              en: 'The name people call the Quartier by, e.g. "Greif".',
              de: 'Der Name, mit dem das Quartier gerufen wird, z.B. "Greif".',
              fr: 'Le nom sous lequel on appelle le quartier, par ex. « Greif ».',
            },
          },
        },
      ],
    },
    {
      name: 'mapAnnotation',
      type: 'relationship',
      relationTo: 'camp-map-annotations',
      label: {
        en: 'Area on the camp map',
        de: 'Fläche auf der Lagerplatzkarte',
        fr: 'Zone sur la carte du camp',
      },
      filterOptions: { annotationType: { equals: 'polygon' } },
      admin: {
        description: {
          en: 'The area of this Quartier, drawn as a polygon on the camp map.',
          de: 'Die Fläche dieses Quartiers, als Polygon auf der Lagerplatzkarte eingezeichnet.',
          fr: 'La zone de ce quartier, dessinée comme polygone sur la carte du camp.',
        },
      },
    },
    {
      name: 'hoefe',
      type: 'join',
      collection: 'hoefe',
      on: 'quartier',
      label: { en: 'Höfe', de: 'Höfe', fr: 'Hofs' },
      admin: {
        defaultColumns: ['name', 'groupId'],
        description: {
          en: 'The Höfe in this Quartier. Change it on the Hof.',
          de: 'Die Höfe in diesem Quartier. Geändert wird es auf dem Hof.',
          fr: 'Les Hofs de ce quartier. Se modifie sur le Hof.',
        },
      },
    },
  ],
};
