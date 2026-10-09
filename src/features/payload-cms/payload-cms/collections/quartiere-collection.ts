import {
  hasAdminOrWebAccess,
  isEditor,
} from '@/features/payload-cms/payload-cms/access-rules/roles';
import { AdminPanelDashboardGroups } from '@/features/payload-cms/payload-cms/admin-panel-dashboard-groups';
import type { CollectionConfig } from 'payload';

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
  labels: {
    singular: { en: 'Quartier', de: 'Quartier', fr: 'Quartier' },
    plural: { en: 'Quartiers', de: 'Quartiere', fr: 'Quartiers' },
  },
  admin: {
    useAsTitle: 'name',
    group: AdminPanelDashboardGroups.AppCampsite.label,
    defaultColumns: ['name', 'mapAnnotation', 'hoefe'],
    description: {
      en: 'The Quartiere of the campsite. Assign a Hof to its Quartier on the Hof.',
      de: 'Die Quartiere des Lagerplatzes. Einem Hof wird sein Quartier auf dem Hof zugewiesen.',
      fr: 'Les quartiers du terrain de camp. Un Hof est attribué à son quartier sur le Hof.',
    },
  },
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
          en: 'Shown next to the Hof, e.g. "Quartier 3".',
          de: 'Wird neben dem Hof angezeigt, z.B. "Quartier 3".',
          fr: 'Affiché à côté du Hof, par ex. « Quartier 3 ».',
        },
      },
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
