import { LinkField } from '@/features/payload-cms/payload-cms/shared-fields/link-field';
import type { Block } from 'payload';

export const leadSectionBlock: Block = {
  slug: 'leadSection',
  interfaceName: 'LeadSectionBlock',

  imageURL: '/admin-block-images/lead-section-block.png',
  imageAltText: 'Lead section block',

  labels: {
    singular: {
      de: 'Einleitung (Lead)',
      en: 'Lead Section',
      fr: 'Chapeau (Lead)',
    },
    plural: {
      de: 'Einleitungen (Lead)',
      en: 'Lead Sections',
      fr: 'Chapeaux (Lead)',
    },
  },

  fields: [
    {
      name: 'eyebrow',
      type: 'text',
      required: false,
      label: {
        de: 'Überzeile',
        en: 'Eyebrow',
        fr: 'Surtitre',
      },
      admin: {
        description: {
          de: 'Kurzes Label über dem Lead-Text (z.B. "Prävention & Kindeswohl").',
          en: 'Short label above the lead text (e.g. "Prevention & child protection").',
          fr: 'Court label au-dessus du chapeau (par ex. « Prévention et protection de l’enfance »).',
        },
      },
    },
    {
      name: 'lead',
      type: 'textarea',
      required: true,
      label: {
        de: 'Lead-Text',
        en: 'Lead Text',
        fr: 'Texte du chapeau',
      },
      admin: {
        description: {
          de: 'Der einleitende Absatz. Er wird gross gesetzt – zwei bis vier Sätze genügen.',
          en: 'The opening paragraph. It is set in large type – two to four sentences are enough.',
          fr: 'Le paragraphe d’introduction. Il est composé en grand – deux à quatre phrases suffisent.',
        },
      },
    },
    {
      name: 'image',
      type: 'relationship',
      relationTo: 'images',
      required: false,
      label: {
        de: 'Bild',
        en: 'Image',
        fr: 'Image',
      },
      admin: {
        description: {
          de: 'Optionales Bild oder Logo neben dem Lead-Text.',
          en: 'Optional image or logo next to the lead text.',
          fr: 'Image ou logo facultatif à côté du chapeau.',
        },
      },
    },
    {
      name: 'imageShape',
      type: 'select',
      required: true,
      defaultValue: 'circle',
      label: {
        de: 'Bildform',
        en: 'Image Shape',
        fr: 'Forme de l’image',
      },
      admin: {
        condition: (_, siblingData) =>
          siblingData['image'] !== undefined && siblingData['image'] !== null,
      },
      options: [
        { label: { de: 'Rund', en: 'Circle', fr: 'Rond' }, value: 'circle' },
        { label: { de: 'Abgerundet', en: 'Rounded', fr: 'Arrondi' }, value: 'rounded' },
        { label: { de: 'Ohne Rahmen', en: 'Plain', fr: 'Sans cadre' }, value: 'plain' },
      ],
    },
    {
      name: 'quickLinks',
      type: 'array',
      required: false,
      maxRows: 4,
      label: {
        de: 'Schnellzugriffe',
        en: 'Quick Links',
        fr: 'Accès rapides',
      },
      labels: {
        singular: { de: 'Schnellzugriff', en: 'Quick Link', fr: 'Accès rapide' },
        plural: { de: 'Schnellzugriffe', en: 'Quick Links', fr: 'Accès rapides' },
      },
      admin: {
        description: {
          de: 'Bis zu vier kompakte Links direkt unter dem Lead-Text.',
          en: 'Up to four compact links directly below the lead text.',
          fr: 'Jusqu’à quatre liens compacts directement sous le chapeau.',
        },
        initCollapsed: true,
      },
      fields: [
        {
          name: 'label',
          type: 'text',
          required: true,
          label: {
            de: 'Beschriftung',
            en: 'Label',
            fr: 'Libellé',
          },
        },
        LinkField(true),
      ],
    },
  ],
};
