import type { Block } from 'payload';

export const processStepsBlock: Block = {
  slug: 'processSteps',
  interfaceName: 'ProcessStepsBlock',

  imageURL: '/admin-block-images/process-steps-block.png',
  imageAltText: 'Process steps block',

  labels: {
    singular: {
      de: 'Ablauf in Schritten',
      en: 'Process Steps',
      fr: 'Étapes du processus',
    },
    plural: {
      de: 'Abläufe in Schritten',
      en: 'Process Steps',
      fr: 'Étapes du processus',
    },
  },

  fields: [
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
    {
      name: 'layout',
      type: 'select',
      required: true,
      defaultValue: 'horizontal',
      label: {
        de: 'Anordnung',
        en: 'Layout',
        fr: 'Disposition',
      },
      admin: {
        description: {
          de: 'Nebeneinander eignet sich für kurze Schritte, untereinander für längere Texte. Auf dem Handy stehen die Schritte immer untereinander.',
          en: 'Side by side suits short steps, stacked suits longer text. On mobile the steps are always stacked.',
          fr: 'Côte à côte convient aux étapes courtes, empilé aux textes plus longs. Sur mobile, les étapes sont toujours empilées.',
        },
      },
      options: [
        {
          label: { de: 'Nebeneinander', en: 'Side by side', fr: 'Côte à côte' },
          value: 'horizontal',
        },
        { label: { de: 'Untereinander', en: 'Stacked', fr: 'Empilé' }, value: 'vertical' },
      ],
    },
    {
      name: 'steps',
      type: 'array',
      required: true,
      minRows: 2,
      maxRows: 6,
      label: {
        de: 'Schritte',
        en: 'Steps',
        fr: 'Étapes',
      },
      labels: {
        singular: { de: 'Schritt', en: 'Step', fr: 'Étape' },
        plural: { de: 'Schritte', en: 'Steps', fr: 'Étapes' },
      },
      admin: {
        description: {
          de: 'Die Schritte werden in dieser Reihenfolge nummeriert (2–6 Schritte).',
          en: 'The steps are numbered in this order (2–6 steps).',
          fr: 'Les étapes sont numérotées dans cet ordre (2 à 6 étapes).',
        },
        initCollapsed: true,
      },
      fields: [
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
      ],
    },
  ],
};
