import { LinkField } from '@/features/payload-cms/payload-cms/shared-fields/link-field';
import type { Block } from 'payload';

export const contactPersonBlock: Block = {
  slug: 'contactPerson',
  interfaceName: 'ContactPersonBlock',

  imageURL: '/admin-block-images/contact-person-block.png',
  imageAltText: 'Contact Person Block',

  labels: {
    singular: {
      de: 'Ansprechperson',
      en: 'Contact Person',
      fr: 'Personne de contact',
    },
    plural: {
      de: 'Ansprechpersonen',
      en: 'Contact Persons',
      fr: 'Personnes de contact',
    },
  },

  fields: [
    {
      name: 'label',
      type: 'text',
      required: true,
      defaultValue: 'EURE ANSPRECHPERSON',
      label: {
        de: 'Label (z.B. EURE ANSPRECHPERSON)',
        en: 'Label',
        fr: 'Étiquette',
      },
    },
    {
      name: 'name',
      type: 'text',
      required: true,
      label: {
        de: 'Name / Ressort',
        en: 'Name',
        fr: 'Nom',
      },
    },
    {
      name: 'description',
      type: 'textarea',
      required: true,
      label: {
        de: 'Beschreibung',
        en: 'Description',
        fr: 'Description',
      },
    },
    {
      name: 'portrait',
      type: 'relationship',
      relationTo: 'images',
      required: false,
      label: {
        de: 'Portrait',
        en: 'Portrait',
        fr: 'Portrait',
      },
    },
    {
      name: 'linkLabel',
      type: 'text',
      required: true,
      label: {
        de: 'Link-Text',
        en: 'Link Label',
        fr: 'Texte du lien',
      },
    },
    LinkField(false),
  ],
};
