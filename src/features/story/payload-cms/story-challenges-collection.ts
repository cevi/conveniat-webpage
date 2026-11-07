import {
  campDayField,
  storyAccess,
  storyAdminGroup,
  visibleFromField,
} from '@/features/story/payload-cms/story-fields';
import type { CollectionConfig } from 'payload';

/**
 * A challenge a figure of the story sets the Höfe, to be done during Stadtleben or free time.
 * The app announces it to Leitende; it is confirmed in person, at the Infopoint.
 */
export const StoryChallengesCollection: CollectionConfig = {
  slug: 'story-challenges',
  labels: {
    singular: { de: 'Challenge', en: 'Challenge', fr: 'Défi' },
    plural: { de: 'Challenges', en: 'Challenges', fr: 'Défis' },
  },
  admin: {
    group: storyAdminGroup,
    useAsTitle: 'title',
    defaultColumns: ['title', 'from', 'day', 'visibleFrom'],
  },
  defaultSort: 'day',
  access: storyAccess,
  fields: [
    {
      name: 'title',
      label: { de: 'Titel', en: 'Title', fr: 'Titre' },
      type: 'text',
      required: true,
      localized: true,
    },
    {
      type: 'row',
      fields: [
        {
          name: 'from',
          label: { de: 'Von', en: 'From', fr: 'De' },
          type: 'relationship',
          relationTo: 'story-figures',
          admin: {
            width: '34%',
            description: {
              de: 'Die Figur, die herausfordert.',
              en: 'The figure who sets the challenge.',
              fr: 'Le personnage qui lance le défi.',
            },
          },
        },
        { ...campDayField(true), admin: { ...campDayField(true).admin, width: '33%' } },
        {
          name: 'until',
          label: { de: 'Bis', en: 'Until', fr: 'Jusqu’à' },
          type: 'date',
          admin: {
            width: '33%',
            date: { pickerAppearance: 'dayAndTime', displayFormat: 'EEE dd.MM.yyyy HH:mm' },
            description: {
              de: 'Danach gilt sie als vorbei.',
              en: 'After this it is over.',
              fr: 'Ensuite, il est terminé.',
            },
          },
        },
      ],
    },
    {
      name: 'message',
      label: { de: 'Botschaft der Figur', en: 'Message of the figure', fr: 'Message' },
      type: 'textarea',
      localized: true,
      admin: {
        rows: 3,
        placeholder: '«Man sagt, eure Höfe seien stark. Beweist es mir!»',
      },
    },
    {
      name: 'task',
      label: { de: 'Aufgabe', en: 'Task', fr: 'Tâche' },
      type: 'textarea',
      localized: true,
      required: true,
      admin: { rows: 5 },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'confirmAt',
          label: { de: 'Bestätigung bei', en: 'Confirmed at', fr: 'Confirmation à' },
          type: 'relationship',
          relationTo: 'camp-map-annotations',
          admin: {
            width: '50%',
            description: {
              de: 'Meist der Infopoint. Die App zeigt den Ort auf der Karte.',
              en: 'Usually the Infopoint. The app shows the place on the map.',
              fr: 'En général l’Infopoint. L’app montre le lieu sur la carte.',
            },
          },
        },
        {
          name: 'scheduleEntries',
          label: { de: 'Programmblöcke', en: 'Programme blocks', fr: 'Blocs du programme' },
          type: 'relationship',
          relationTo: 'camp-schedule-entry',
          hasMany: true,
          admin: {
            width: '50%',
            description: {
              de: 'Z.B. Stadtleben: der Block zeigt Leitenden die Challenge.',
              en: 'E.g. Stadtleben: the block shows the challenge to Leitende.',
              fr: 'P. ex. Stadtleben : le bloc montre le défi aux responsables.',
            },
          },
        },
      ],
    },
    visibleFromField({
      de: 'Ab dann sehen Leitende die Challenge, z.B. am Morgen des Tages.',
      en: 'Leitende see the challenge from then on, e.g. in the morning of the day.',
      fr: 'Les responsables voient le défi dès ce moment.',
    }),
  ],
};
