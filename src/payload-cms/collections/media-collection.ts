import type { CollectionConfig } from 'payload';

export const MediaCollection: CollectionConfig = {
  slug: 'media',
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'alt',
      label: 'Alt Text',
      type: 'text',
      required: true,
      admin: {
        description: {
          en: 'Describe the image for screen readers and search engines',
          de: 'Beschreiben Sie das Bild für Screenreader und Suchmaschinen',
          fr: "Décrivez l'image pour les lecteurs d'écran et les moteurs de recherche",
        },
      },
    },
  ],
  upload: true,
};
