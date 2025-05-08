import type { Block } from 'payload';

export const singlePictureBlock: Block = {
  slug: 'singlePicture',

  imageURL: '/admin-block-images/single-picture-block.png',
  imageAltText: 'Single picture block',

  fields: [
    {
      name: 'image',
      label: 'Images',
      type: 'relationship',
      relationTo: 'images',
      hasMany: false,
      required: true,
    },
  ],
};
