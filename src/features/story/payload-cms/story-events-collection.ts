import { getValidationMessage } from '@/features/payload-cms/payload-cms/utils/validation-messages';
import {
  campDayField,
  storyAccess,
  storyAdminGroup,
  visibleFromField,
} from '@/features/story/payload-cms/story-fields';
import type { CollectionConfig, DateFieldValidation } from 'payload';

/** A day is needed unless the entry is the Vorgeschichte, which comes before the first day. */
const validateDay: DateFieldValidation = (value, { siblingData, req }) => {
  if ((siblingData as { isPrologue?: boolean }).isPrologue === true) return true;
  if (value !== null && value !== undefined) return true;
  return getValidationMessage(req.i18n.language, {
    de: 'Wähle einen Tag oder markiere das Ereignis als Vorgeschichte.',
    en: 'Choose a day or mark the event as the backstory.',
    fr: 'Choisis un jour ou marque l’événement comme préhistoire.',
  });
};

/**
 * What happened in the story: the Vorgeschichte, then one or more Ereignisse per camp day. The
 * links to the programme, the figures and the map live here, on the story's side, so the story
 * team never edits a block of the programme.
 */
export const StoryEventsCollection: CollectionConfig = {
  slug: 'story-events',
  labels: {
    singular: { de: 'Ereignis', en: 'Story event', fr: 'Événement' },
    plural: { de: 'Ereignisse', en: 'Story events', fr: 'Événements' },
  },
  admin: {
    group: storyAdminGroup,
    useAsTitle: 'title',
    defaultColumns: ['title', 'day', 'visibleFrom', 'figures'],
    description: {
      de: 'Was in der Story passiert ist. Am schnellsten bearbeitet im Story-Board.',
      en: 'What happened in the story. Fastest to edit on the Story-Board.',
      fr: 'Ce qui s’est passé dans l’histoire. Plus rapide à éditer dans le Story-Board.',
    },
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
          name: 'isPrologue',
          label: { de: 'Vorgeschichte', en: 'Backstory', fr: 'Préhistoire' },
          type: 'checkbox',
          defaultValue: false,
          admin: {
            width: '30%',
            description: {
              de: 'Steht vor dem ersten Lagertag.',
              en: 'Comes before the first camp day.',
              fr: 'Avant le premier jour du camp.',
            },
          },
        },
        {
          ...campDayField(false),
          validate: validateDay,
          admin: {
            ...campDayField(false).admin,
            width: '70%',
            condition: (_data, siblingData) => siblingData['isPrologue'] !== true,
          },
        },
      ],
    },
    {
      name: 'text',
      label: { de: 'Was ist passiert?', en: 'What happened?', fr: 'Que s’est-il passé ?' },
      type: 'textarea',
      localized: true,
      admin: {
        rows: 8,
        description: {
          de: 'Kurz und so, dass Leitende es ihren TNs erzählen können. Eine Leerzeile beginnt einen neuen Absatz.',
          en: 'Short, so that Leitende can retell it to their participants. A blank line starts a new paragraph.',
          fr: 'Court, pour que les responsables puissent le raconter. Une ligne vide commence un nouveau paragraphe.',
        },
      },
    },
    {
      type: 'collapsible',
      label: { de: 'Verknüpfungen', en: 'Links', fr: 'Liens' },
      fields: [
        {
          name: 'scheduleEntries',
          label: { de: 'Programmblöcke', en: 'Programme blocks', fr: 'Blocs du programme' },
          type: 'relationship',
          relationTo: 'camp-schedule-entry',
          hasMany: true,
          admin: {
            description: {
              de: 'Diese Blöcke zeigen Leitenden in der App «Was bisher geschah» mit einem Link hierher, sobald das Ereignis sichtbar ist.',
              en: 'Once the event is visible, these blocks show Leitende a link here in the app.',
              fr: 'Dès que l’événement est visible, ces blocs montrent un lien ici aux responsables.',
            },
          },
        },
        {
          name: 'figures',
          label: { de: 'Figuren', en: 'Figures', fr: 'Personnages' },
          type: 'relationship',
          relationTo: 'story-figures',
          hasMany: true,
        },
        {
          name: 'locations',
          label: { de: 'Orte auf der Karte', en: 'Places on the map', fr: 'Lieux sur la carte' },
          type: 'relationship',
          relationTo: 'camp-map-annotations',
          hasMany: true,
        },
      ],
    },
    visibleFromField({
      de: 'Erst ab dann sehen Leitende das Ereignis, meist kurz nach dem Block, in dem es passiert.',
      en: 'Leitende see the event from then on, usually just after the block it happens in.',
      fr: 'Les responsables voient l’événement à partir de ce moment.',
    }),
  ],
};
