import { AdminPanelDashboardGroups } from '@/features/payload-cms/payload-cms/admin-panel-dashboard-groups';
import { generateImageName } from '@/features/payload-cms/payload-cms/collections/image-collection';
import type { CollectionConfig } from 'payload';
import { canAccessAdminPanel } from '../access-rules/can-access-admin-panel';

export const UserSubmittedImagesCollection: CollectionConfig = {
  slug: 'userSubmittedImages',
  trash: true,
  labels: {
    singular: {
      en: 'User Submitted Image',
      de: 'Benutzer hochgeladenes Bild',
      fr: "Image d'Utilisateurs",
    },
    plural: {
      en: 'User Submitted Images',
      de: 'Benutzer hochgeladene Bilder',
      fr: "Images d'Utilisateurs",
    },
  },
  admin: {
    group: AdminPanelDashboardGroups.InternalCollections,
    groupBy: false,
    disableCopyToLocale: true,
    defaultColumns: ['updatedAt', 'user', 'filename'],
  },
  access: {
    admin: canAccessAdminPanel,
    create: canAccessAdminPanel,
    delete: canAccessAdminPanel,
    update: canAccessAdminPanel,
  },
  fields: [
    {
      name: 'uploaded_by',
      type: 'relationship',
      relationTo: 'users',
      hasMany: false,
      required: true,
      localized: false,
      label: {
        en: 'The user who submitted the image',
        de: 'Der Benutzer, der das Bild hochgeladen hat.',
        fr: "L'utilisateur qui a soumis l'image",
      },
    },
    {
      name: 'original_filename',
      type: 'text',
      required: false,
      localized: false,
      label: {
        en: 'The original filename of the image.',
        de: 'Der Original Dateiname des Bildes',
        fr: "Le nom de fichier original de l'image",
      },
    },
    {
      name: 'user_description',
      type: 'text',
      required: true,
      localized: false,
      label: {
        en: 'The description the user submitted',
        de: 'Die Beschreibung, die der Benutzer hinzugefügt hat.',
        fr: "La description soumise par l'utilisateur",
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
