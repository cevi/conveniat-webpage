import { LinkField } from '@/features/payload-cms/payload-cms/shared-fields/link-field';
import type { Block } from 'payload';

export const cardGridBlock: Block = {
  slug: 'cardGrid',
  interfaceName: 'CardGridBlock',

  imageURL: '/admin-block-images/card-grid-block.png',
  imageAltText: 'Card Grid block',

  labels: {
    singular: {
      de: 'Karten-Raster',
      en: 'Card Grid',
      fr: 'Grille de cartes',
    },
    plural: {
      de: 'Karten-Raster',
      en: 'Card Grids',
      fr: 'Grilles de cartes',
    },
  },

  fields: [
    {
      name: 'cards',
      type: 'array',
      required: true,
      minRows: 1,
      maxRows: 6,
      labels: {
        singular: {
          de: 'Karte',
          en: 'Card',
          fr: 'Carte',
        },
        plural: {
          de: 'Karten',
          en: 'Cards',
          fr: 'Cartes',
        },
      },
      admin: {
        description: {
          de: 'Die einzelnen Karten im Raster (1–6 Karten).',
          en: 'The individual cards in the grid (1–6 cards).',
          fr: 'Les cartes individuelles dans la grille (1 à 6 cartes).',
        },
        initCollapsed: true,
      },
      fields: [
        {
          name: 'iconType',
          type: 'radio',
          defaultValue: 'icon',
          admin: {
            layout: 'horizontal',
          },
          label: {
            de: 'Icon-Typ',
            en: 'Icon Type',
            fr: 'Type d\'icône',
          },
          options: [
            {
              label: { de: 'Vordefiniertes Icon', en: 'Predefined Icon', fr: 'Icône prédéfinie' },
              value: 'icon',
            },
            {
              label: { de: 'Eigenes Bild', en: 'Custom Image', fr: 'Image personnalisée' },
              value: 'image',
            },
          ],
        },
        {
          name: 'icon',
          type: 'select',
          required: true,
          defaultValue: 'users',
          label: {
            de: 'Vordefiniertes Icon',
            en: 'Predefined Icon',
            fr: 'Icône prédéfinie',
          },
          admin: {
            condition: (_, siblingData) => siblingData.iconType === 'icon',
            description: {
              de: 'Wähle ein Icon für die Karte.',
              en: 'Choose an icon for the card.',
              fr: 'Choisissez une icône pour la carte.',
            },
          },
          options: [
            { label: '👥 Users', value: 'users' },
            { label: '🙋 Hand Helping', value: 'handHelping' },
            { label: '👨‍👩‍👧 Family', value: 'family' },
            { label: '⛺ Tent', value: 'tent' },
            { label: '🏕️ Tent Tree', value: 'tentTree' },
            { label: '📋 Clipboard List', value: 'clipboardList' },
            { label: '🎯 Target', value: 'target' },
            { label: '📍 Map Pin', value: 'mapPin' },
            { label: '📅 Calendar', value: 'calendar' },
            { label: '💬 Message Circle', value: 'messageCircle' },
            { label: '🔔 Bell', value: 'bell' },
            { label: '⭐ Star', value: 'star' },
            { label: '❤️ Heart', value: 'heart' },
            { label: '🏠 House', value: 'house' },
            { label: '🎵 Music', value: 'music' },
            { label: '📷 Camera', value: 'camera' },
            { label: '🌲 Tree Pine', value: 'treePine' },
            { label: '🔥 Flame', value: 'flame' },
            { label: '🧭 Compass', value: 'compass' },
            { label: '🎒 Backpack', value: 'backpack' },
          ],
        },
        {
          name: 'customImage',
          type: 'relationship',
          relationTo: 'images',
          required: true,
          label: {
            de: 'Eigenes Bild',
            en: 'Custom Image',
            fr: 'Image personnalisée',
          },
          admin: {
            condition: (_, siblingData) => siblingData.iconType === 'image',
            description: {
              de: 'Wähle ein quadratisches Bild oder Logo (z.B. SVG oder PNG).',
              en: 'Choose a square image or logo (e.g. SVG or PNG).',
              fr: 'Choisissez une image ou un logo carré (par ex. SVG ou PNG).',
            },
          },
        },
        {
          name: 'title',
          type: 'text',
          required: true,
          label: {
            de: 'Titel',
            en: 'Title',
            fr: 'Titre',
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
          name: 'linkLabel',
          type: 'text',
          required: true,
          label: {
            de: 'Link-Text',
            en: 'Link Label',
            fr: 'Texte du lien',
          },
          admin: {
            description: {
              de: 'Der Text für den Link (z.B. "Mehr erfahren →").',
              en: 'The text for the link (e.g. "Learn more →").',
              fr: 'Le texte du lien (par ex. « En savoir plus → »).',
            },
          },
        },
        LinkField(false),
      ],
    },
  ],
};
