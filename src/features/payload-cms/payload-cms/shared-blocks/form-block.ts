import { filterOptionsOnlyPublished } from '@/features/payload-cms/payload-cms/utils/filter-options-only-published';
import type { Block } from 'payload';

export const formBlock: Block = {
  slug: 'formBlock',
  interfaceName: 'FormBlock',

  imageURL: '/admin-block-images/form-block.png',
  imageAltText: 'Form block',

  fields: [
    {
      name: 'form',
      type: 'relationship',
      relationTo: 'forms',
      required: true,
      hasMany: false,
      filterOptions: filterOptionsOnlyPublished,
    },
    {
      name: 'isSticky',
      type: 'checkbox',
      defaultValue: true,
      label: {
        de: 'Klebrig beim Scrollen (Sticky Top)',
        en: 'Sticky on scroll (Sticky Top)',
        fr: 'Fixe au défilement (Sticky Top)',
      },
      admin: {
        description: {
          de: 'Fixiert den Formularblock oben am Bildschirmrand beim Scrollen auf grossen Bildschirmen.',
          en: 'Fixes the form block to the top of the screen when scrolling on large screens.',
          fr: 'Fixe le bloc de formulaire en haut de l’écran lors du défilement sur grands écrans.',
        },
      },
    },
  ],
};
