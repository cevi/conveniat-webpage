import { Block } from 'payload';
import { photoCarouselMinSelectionValidation } from '@/payload-cms/collections/blog-article/validation';

export const PhotoCarouselBlock: Block = {
  slug: 'photoCarousel',
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
