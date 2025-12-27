import { generateImageName } from '@/features/payload-cms/payload-cms/collections/image-collection';
import type { CollectionConfig } from 'payload';

/**
 * Collection for images uploaded within chats.
 * Hidden from the admin panel and restricted by chat membership.
 */
export const ChatImagesCollection: CollectionConfig = {
  slug: 'chat-images',
  admin: {
    hidden: true,
  },
  access: {
    // Access is strictly handled via TRPC pre-signed URLs.
    // No direct Payload API access allowed.
    read: () => false,
    create: () => false,
    update: () => false,
    delete: () => false,
  },
  fields: [
    {
      name: 'chatId',
      type: 'text',
      required: true,
      index: true,
    },
    {
      name: 'uploadedBy',
      type: 'relationship',
      relationTo: 'users',
      required: true,
    },
  ],
  upload: {
    mimeTypes: ['image/*'],
    disableLocalStorage: true,
    imageSizes: [
      {
        name: 'thumbnail',
        width: 400,
        height: 400,
        fit: 'cover',
        generateImageName,
      },
    ],
  },
};
