import { AdminPanelDashboardGroups } from '@/features/payload-cms/payload-cms/admin-panel-dashboard-groups';
import type { CollectionConfig, GenerateImageName } from 'payload';

/**
 * Generates a unique image name based on the provided parameters.
 *
 * This function inserts a random suffix to ensure that the image name is updated on
 * every change, effectively preventing any caching issues.
 *
 * In minio, we only store the latest version of the image.
 *
 * @param height
 * @param sizeName
 * @param extension
 * @param width
 * @param originalName
 */
const generateImageName: GenerateImageName = ({ height, sizeName, extension, width }) => {
  const randomSuffix = Math.random().toString(36).slice(2, 8);
  return `${randomSuffix}-${sizeName}-${height}-${width}.${extension}`;
};

export const ImageCollection: CollectionConfig = {
  slug: 'images',
  labels: {
    singular: {
      en: 'Image',
      de: 'Bild',
      fr: 'Image',
    },
    plural: {
      en: 'Images',
      de: 'Bilder',
      fr: 'Images',
    },
  },
  admin: {
    group: AdminPanelDashboardGroups.InternalCollections,
    groupBy: true,
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

    adminThumbnail: 'tiny',
    cacheTags: true,

    // disable local storage for images, we use minio for storage
    disableLocalStorage: true,

    // we store the original image as well as three pre-optimized versions
    // the final optimization is done by next/image
    imageSizes: [
      // the tiny image is used for the admin panel
      {
        name: 'tiny',
        fit: 'cover',
        width: 140,
        height: 140,
        formatOptions: { format: 'webp' },
        withoutEnlargement: true,
        generateImageName,
      },

      // the large image is used as the base for generating the next/image optimized images
      {
        name: 'large',
        fit: 'cover',
        width: 1800,
        formatOptions: { format: 'webp' },
        height: undefined, // keep original aspect ratio
        withoutEnlargement: true,
        generateImageName,
      },
    ],
  },
};
