import type { Block } from 'payload';
import { photoCarouselMinSelectionValidation } from '@/features/payload-cms/settings/collections/blog-article/validation';

export const photoCarouselBlock: Block = {
  slug: 'photoCarousel',

  imageURL: '/admin-block-images/photo-carousel-block.png',
  imageAltText: 'Photo carousel block',

  fields: [
    {
      name: 'images',
      label: 'Images',
      type: 'relationship',
      relationTo: 'images',
      hasMany: true,
      required: true,
      validate: photoCarouselMinSelectionValidation,
    },
  ],
};
