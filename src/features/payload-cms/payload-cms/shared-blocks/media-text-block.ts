import { LinkField } from '@/features/payload-cms/payload-cms/shared-fields/link-field';
import { RichTextParagraphsField } from '@/features/payload-cms/payload-cms/shared-fields/rich-text-paragraph-field';
import type { Block } from 'payload';

export const mediaTextBlock: Block = {
  slug: 'mediaText',
  interfaceName: 'MediaTextBlock',

  imageURL: '/admin-block-images/media-text-block.png',
  imageAltText: 'Media and text block',

  labels: {
    singular: {
      de: 'Bild mit Text',
      en: 'Media & Text',
      fr: 'Image et texte',
    },
    plural: {
      de: 'Bild mit Text',
      en: 'Media & Text',
      fr: 'Image et texte',
    },
  },

  fields: [
    {
      name: 'image',
      type: 'relationship',
      relationTo: 'images',
      required: true,
      label: {
        de: 'Bild',
        en: 'Image',
        fr: 'Image',
      },
    },
    {
      name: 'imagePosition',
      type: 'select',
      required: true,
      defaultValue: 'right',
      label: {
        de: 'Bildposition',
        en: 'Image Position',
        fr: 'Position de l’image',
      },
      admin: {
        description: {
          de: 'Auf welcher Seite das Bild steht. Auf dem Handy steht das Bild immer oben.',
          en: 'Which side the image sits on. On mobile the image is always on top.',
          fr: 'De quel côté se trouve l’image. Sur mobile, l’image est toujours en haut.',
        },
      },
      options: [
        { label: { de: 'Rechts', en: 'Right', fr: 'À droite' }, value: 'right' },
        { label: { de: 'Links', en: 'Left', fr: 'À gauche' }, value: 'left' },
      ],
    },
    {
      name: 'imageWidth',
      type: 'select',
      required: true,
      defaultValue: 'medium',
      label: {
        de: 'Bildbreite',
        en: 'Image Width',
        fr: 'Largeur de l’image',
      },
      admin: {
        description: {
          de: 'Wie viel Platz das Bild neben dem Text einnimmt. Bei viel Text "Schmal" wählen.',
          en: 'How much room the image takes next to the text. Choose "Narrow" when there is a lot of text.',
          fr: 'L’espace occupé par l’image à côté du texte. Choisissez « Étroite » s’il y a beaucoup de texte.',
        },
      },
      options: [
        { label: { de: 'Schmal (1/3)', en: 'Narrow (1/3)', fr: 'Étroite (1/3)' }, value: 'narrow' },
        {
          label: { de: 'Mittel (2/5)', en: 'Medium (2/5)', fr: 'Moyenne (2/5)' },
          value: 'medium',
        },
        { label: { de: 'Breit (1/2)', en: 'Wide (1/2)', fr: 'Large (1/2)' }, value: 'wide' },
      ],
    },
    {
      name: 'imageShape',
      type: 'select',
      required: true,
      defaultValue: 'rounded',
      label: {
        de: 'Bildform',
        en: 'Image Shape',
        fr: 'Forme de l’image',
      },
      options: [
        { label: { de: 'Abgerundet', en: 'Rounded', fr: 'Arrondie' }, value: 'rounded' },
        { label: { de: 'Rund', en: 'Circle', fr: 'Ronde' }, value: 'circle' },
        {
          label: { de: 'Freigestellt (ohne Rahmen)', en: 'Plain (no frame)', fr: 'Sans cadre' },
          value: 'plain',
        },
      ],
    },
    {
      name: 'background',
      type: 'select',
      required: true,
      defaultValue: 'none',
      label: {
        de: 'Hintergrund',
        en: 'Background',
        fr: 'Arrière-plan',
      },
      admin: {
        description: {
          de: 'Ein getönter Hintergrund hebt den Abschnitt vom Rest der Seite ab.',
          en: 'A tinted background sets the section apart from the rest of the page.',
          fr: 'Un arrière-plan teinté distingue la section du reste de la page.',
        },
      },
      options: [
        { label: { de: 'Keiner', en: 'None', fr: 'Aucun' }, value: 'none' },
        {
          label: { de: 'Getönt (grün)', en: 'Tinted (green)', fr: 'Teinté (vert)' },
          value: 'tinted',
        },
      ],
    },
    {
      name: 'eyebrow',
      type: 'text',
      required: false,
      label: {
        de: 'Überzeile',
        en: 'Eyebrow',
        fr: 'Surtitre',
      },
    },
    {
      name: 'title',
      type: 'text',
      required: false,
      label: {
        de: 'Titel',
        en: 'Title',
        fr: 'Titre',
      },
    },
    RichTextParagraphsField,
    {
      name: 'linkLabel',
      type: 'text',
      required: false,
      label: {
        de: 'Link-Text',
        en: 'Link Label',
        fr: 'Texte du lien',
      },
      admin: {
        description: {
          de: 'Beschriftung der Schaltfläche unter dem Text. Leer lassen für keine Schaltfläche.',
          en: 'Label of the button below the text. Leave empty for no button.',
          fr: 'Libellé du bouton sous le texte. Laisser vide pour ne pas afficher de bouton.',
        },
      },
    },
    LinkField(false),
  ],
};
