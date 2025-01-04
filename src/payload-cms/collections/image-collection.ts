import type { CollectionConfig } from 'payload';
import { AdminPanelDashboardGroups } from '@/payload-cms/admin-panel-dashboard-groups';

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
    read: () => true,
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
  ],
  upload: {
    mimeTypes: ['image/*'],
  },
};
