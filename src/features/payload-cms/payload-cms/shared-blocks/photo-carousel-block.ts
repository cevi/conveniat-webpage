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
    {
      name: 'aspectRatio',
      type: 'select',
      defaultValue: '3/2',
      label: {
        de: 'Seitenverhältnis',
        en: 'Aspect Ratio',
        fr: "Format d'image",
      },
      admin: {
        description: {
          de: 'Das Seitenverhältnis gilt für alle Bilder des Karussells. Bilder, die nicht dazu passen, werden mittig zugeschnitten.',
          en: 'The aspect ratio applies to all images of the carousel. Images that do not match are cropped centrally.',
          fr: "Le format d'image s'applique à toutes les images du carrousel. Les images qui ne correspondent pas sont recadrées au centre.",
        },
      },
      options: [
        {
          label: {
            de: 'Querformat – Breitbild (16:9)',
            en: 'Landscape – Widescreen (16:9)',
            fr: 'Paysage – Écran large (16:9)',
          },
          value: 'video',
        },
        {
          label: {
            de: 'Querformat – Foto (3:2)',
            en: 'Landscape – Photo (3:2)',
            fr: 'Paysage – Photo (3:2)',
          },
          value: '3/2',
        },
        {
          label: {
            de: 'Querformat – Klassisch (4:3)',
            en: 'Landscape – Classic (4:3)',
            fr: 'Paysage – Classique (4:3)',
          },
          value: '4/3',
        },
        {
          label: {
            de: 'Quadrat (1:1)',
            en: 'Square (1:1)',
            fr: 'Carré (1:1)',
          },
          value: '1/1',
        },
        {
          label: {
            de: 'Hochformat – Klassisch (3:4)',
            en: 'Portrait – Classic (3:4)',
            fr: 'Portrait – Classique (3:4)',
          },
          value: '3/4',
        },
        {
          label: {
            de: 'Hochformat – Foto (2:3)',
            en: 'Portrait – Photo (2:3)',
            fr: 'Portrait – Photo (2:3)',
          },
          value: '2/3',
        },
        {
          label: {
            de: 'Hochformat – Story (9:16)',
            en: 'Portrait – Story (9:16)',
            fr: 'Portrait – Story (9:16)',
          },
          value: '9/16',
        },
      ],
    },
  ],
};
