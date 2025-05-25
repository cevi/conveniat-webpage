import { canAccessIdInCollection } from '@/features/payload-cms/payload-cms/access-rules/can-access-id-in-collection';
import { AdminPanelDashboardGroups } from '@/features/payload-cms/payload-cms/admin-panel-dashboard-groups';
import { permissionsField } from '@/features/payload-cms/payload-cms/shared-fields/permissions-field';
import type { CollectionConfig } from 'payload';

export const ImageCollection: CollectionConfig = {
  slug: 'images',
  labels: {
    singular: 'Bild',
    plural: 'Bilder',
  },
  admin: {
    group: AdminPanelDashboardGroups.InternalCollections,
  },
  access: {
    read: canAccessIdInCollection('images'),
  },
  fields: [
    {
      name: 'alt',
      label: 'Alt Text',
      type: 'text',
      required: true,
      localized: true,
      admin: {
        position: 'sidebar',
        description: {
          en: 'Describe the image for screen readers.',
          de: 'Beschreiben Sie das Bild für Screenreader.',
          fr: "Décrivez l'image pour les lecteurs d'écran.",
        },
      },
    },
    {
      name: 'imageCaption',
      label: {
        en: 'Image Caption',
        de: 'Bildunterschrift',
        fr: 'Légende de l’image',
      },
      type: 'text',
      required: false,
      localized: true,
      admin: {
        description: {
          en: 'Optional text to display below the image (e.g. image source, copyright information, explanatory text)',
          de: 'Optionaler Text, der unter dem Bild angezeigt wird (z.B. Bildquelle, Urheberrechtsinformationen, erläuternder Text)',
          fr: 'Texte facultatif à afficher sous l’image (par exemple, source de l’image, informations de droits d’auteur, texte explicatif)',
        },
      },
    },
    permissionsField,
  ],
  upload: {
    mimeTypes: ['image/*'],
  },
};
