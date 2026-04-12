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
    {
      name: 'aspectRatio',
      type: 'select',
      required: true,
      defaultValue: 'video',
      label: {
        de: 'Seitenverhältnis',
        en: 'Aspect Ratio',
        fr: "Format d'image",
      },
      admin: {
        description: {
          de: 'Wähle das Seitenverhältnis des Bildes aus.',
          en: 'Choose the aspect ratio of the image.',
          fr: "Choisissez le format d'image.",
        },
      },
      options: [
        {
          label: {
            de: 'Breitbild (16:9)',
            en: 'Widescreen (16:9)',
            fr: 'Écran large (16:9)',
          },
          value: 'video',
        },
        {
          label: {
            de: 'Foto (3:2)',
            en: 'Photo (3:2)',
            fr: 'Photo (3:2)',
          },
          value: '3/2',
        },
        {
          label: {
            de: 'Banner (2:1)',
            en: 'Banner (2:1)',
            fr: 'Bannière (2:1)',
          },
          value: '2/1',
        },
        {
          label: {
            de: 'Klassisch (4:3)',
            en: 'Classic (4:3)',
            fr: 'Classique (4:3)',
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
            de: 'Panorama (21:9)',
            en: 'Panorama (21:9)',
            fr: 'Panorama (21:9)',
          },
          value: '21/9',
        },
        {
          label: {
            de: 'Automatisch (Originalgrösse)',
            en: 'Auto (Original size)',
            fr: 'Automatique (Taille originale)',
          },
          value: 'auto',
        },
      ],
    },
  ],
};
