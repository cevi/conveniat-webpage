import { photoCarouselMinSelectionValidation } from '@/features/payload-cms/payload-cms/collections/blog-article/validation';
import type { Block } from 'payload';

export const photoCarouselBlock: Block = {
  slug: 'photoCarousel',

  imageURL: '/admin-block-images/photo-carousel-block.png',
  imageAltText: 'Photo carousel block',

  fields: [
    {
      name: 'images',
      label: 'Images',

      admin: {
        isSortable: true,
        appearance: 'drawer',
      },
      type: 'relationship',
      relationTo: 'images',
      hasMany: true,
      required: true,
      validate: photoCarouselMinSelectionValidation,
    },
  ],
};
