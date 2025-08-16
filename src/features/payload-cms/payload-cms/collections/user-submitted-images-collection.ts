import { AdminPanelDashboardGroups } from '@/features/payload-cms/payload-cms/admin-panel-dashboard-groups';
import type { CollectionConfig } from 'payload';
import { generateImageName } from '@/features/payload-cms/payload-cms/collections/image-collection';


export const UserSubmittedImagesCollection: CollectionConfig = {
  slug: 'userSubmittedImages',
  trash: true,
  labels: {
    singular: {
      en: 'User Submitted Image',
      de: 'Benutzer hochgeladenes Bild',
      fr: 'Image User',
    },
    plural: {
      en: 'User Submitted Images',
      de: 'Benutzer hochgeladene Bilder',
      fr: 'Images Users',
    },
  },
  admin: {
    group: AdminPanelDashboardGroups.InternalCollections,
    groupBy: false,
    disableCopyToLocale: true,
    defaultColumns: ['updatedAt', 'user'],
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'uploaded_by',
      type: 'relationship',
      relationTo: 'users',
      hasMany: false,
      required: true,
      localized: false,
      label: 'The user who submitted the image'
    },
    {
      name: 'user_description',
      type: 'text',
      required: true,
      localized: false,
      label: "The description the user submitted"
    },
    {
      name: 'approved',
      type: 'checkbox',
      required: false,
      label: 'This image is approved by the conveniat27 team.'
    }
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
