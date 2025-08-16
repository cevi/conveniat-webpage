import { AdminPanelDashboardGroups } from '@/features/payload-cms/payload-cms/admin-panel-dashboard-groups';
import type { CollectionConfig, Field, GenerateImageName } from 'payload';

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
export const generateImageName: GenerateImageName = ({
  height,
  sizeName,
  extension,
  width,
}): string => {
  const randomSuffix = Math.random().toString(36).slice(2, 8);
  return `${randomSuffix}-${sizeName}-${height}-${width}.${extension}`;
};

const altField = (locale: string): Field => {
  return {
    name: `alt_${locale}`,
    label: `Alt Text (${locale})`,
    type: 'text',
    required: true,
    localized: false,
    admin: {
      description: {
        en: `Describe the image for screen readers. (${locale})`,
        de: `Beschreibe das Bild für Screenreader. (${locale})`,
        fr: `Décrivez l'image pour les lecteurs d'écran. (${locale})`,
      },
    },
  };
};

const imageCaption = (locale: string): Field => {
  return {
    name: `imageCaption_${locale}`,
    label: {
      en: `Image Caption (${locale})`,
      de: `Bildunterschrift (${locale})`,
      fr: `Légende de l’image (${locale})`,
    },
    type: 'text',
    required: false,
    localized: false,
    admin: {
      description: {
        en: `Optional text to display below the image (e.g. image source, copyright information, explanatory text) (${locale})`,
        de: `Optionaler Text, der unter dem Bild angezeigt wird (z.B. Bildquelle, Urheberrechtsinformationen, erläuternder Text) (${locale})`,
        fr: `Texte facultatif à afficher sous l’image (par exemple, source de l’image, informations de droits d’auteur, texte explicatif) (${locale})`,
      },
    },
  };
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
    groupBy: false,
    /** this is broken with our localized versions */
    disableCopyToLocale: true,
    defaultColumns: ['filename', 'alt_de', 'caption_de', 'updatedAt'],
  },
  access: {
    read: () => true,
  },
  fields: [
    { ...altField('de') },
    { ...altField('en') },
    { ...altField('fr') },
    { ...imageCaption('de') },
    { ...imageCaption('en') },
    { ...imageCaption('fr') },
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
