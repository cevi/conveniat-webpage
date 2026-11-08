import {
  storyAccess,
  storyAdminGroup,
  visibleFromField,
} from '@/features/story/payload-cms/story-fields';
import {
  syncDeletedFigureImageVisibility,
  syncStoryImageVisibility,
} from '@/features/story/payload-cms/story-image-visibility';
import type { CollectionConfig } from 'payload';

/**
 * A figure of the story, with what is known about it, in dated sections. Every section and every
 * relationship appears on its own date, so what Leitende read grows with the week.
 */
export const StoryFiguresCollection: CollectionConfig = {
  slug: 'story-figures',
  labels: {
    singular: { de: 'Figur', en: 'Story figure', fr: 'Personnage' },
    plural: { de: 'Figuren', en: 'Story figures', fr: 'Personnages' },
  },
  admin: {
    group: storyAdminGroup,
    useAsTitle: 'name',
    defaultColumns: ['name', 'role', 'belongsTo', 'visibleFrom'],
    description: {
      de: 'Die Figuren der Story. Was über sie bekannt ist, erscheint abschnittweise.',
      en: 'The figures of the story. What is known about them appears section by section.',
      fr: 'Les personnages de l’histoire. Ce qu’on sait d’eux apparaît par sections.',
    },
  },
  defaultSort: 'name',
  access: storyAccess,
  hooks: {
    afterChange: [syncStoryImageVisibility],
    afterDelete: [syncDeletedFigureImageVisibility],
  },
  fields: [
    // the profile above the tabs, so a figure opens on what is known about it
    {
      type: 'row',
      fields: [
        {
          name: 'name',
          label: { de: 'Name', en: 'Name', fr: 'Nom' },
          type: 'text',
          required: true,
          admin: { width: '50%' },
        },
        {
          name: 'role',
          label: { de: 'Rolle', en: 'Role', fr: 'Rôle' },
          type: 'text',
          localized: true,
          admin: {
            width: '50%',
            placeholder: 'Königlicher Champion',
          },
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'belongsTo',
          label: { de: 'Gehört zu', en: 'Belongs to', fr: 'Appartient à' },
          type: 'select',
          required: true,
          defaultValue: 'court',
          options: [
            {
              value: 'court',
              label: {
                de: 'Hofstaat des Königs',
                en: 'The king’s court',
                fr: 'La cour du roi',
              },
            },
            {
              value: 'quartier',
              label: {
                de: 'Quartieroberhaupt',
                en: 'Head of a Quartier',
                fr: 'Chef d’un Quartier',
              },
            },
            {
              value: 'other',
              label: { de: 'Weitere Figuren', en: 'Other figures', fr: 'Autres' },
            },
          ],
          admin: { width: '50%' },
        },
        {
          name: 'quartier',
          label: { de: 'Quartier', en: 'Quartier', fr: 'Quartier' },
          type: 'relationship',
          relationTo: 'quartiere',
          admin: {
            width: '50%',
            condition: (_data, siblingData) => siblingData['belongsTo'] === 'quartier',
          },
        },
      ],
    },
    {
      type: 'tabs',
      tabs: [
        {
          label: { de: 'Was wir wissen', en: 'What we know', fr: 'Ce que l’on sait' },
          admin: {
            description: {
              de: 'Ein Abschnitt pro Enthüllung, neue unten anfügen; die App zeigt das Neueste zuoberst. Jeder erscheint erst ab seiner Zeit, ohne eigene Zeit ab der seines Ereignisses, sonst ab der Figur.',
              en: 'One section per reveal, add new ones at the bottom; the app shows the newest first. Each appears from its own time, without one from its event’s, else from the figure’s.',
              fr: 'Une section par révélation, ajoutée en bas ; l’app montre la plus récente en premier. Chacune apparaît à son heure.',
            },
          },
          fields: [
            {
              name: 'knowledge',
              label: { de: 'Abschnitte', en: 'Sections', fr: 'Sections' },
              labels: {
                singular: { de: 'Abschnitt', en: 'Section', fr: 'Section' },
                plural: { de: 'Abschnitte', en: 'Sections', fr: 'Sections' },
              },
              type: 'array',
              fields: [
                {
                  type: 'row',
                  fields: [
                    visibleFromField(
                      {
                        de: 'Leer: wie das Ereignis, sonst wie die Figur.',
                        en: 'Empty: as the event, else as the figure.',
                        fr: 'Vide : comme l’événement, sinon comme le personnage.',
                      },
                      { required: false, sidebar: false, width: '50%' },
                    ),
                    {
                      name: 'event',
                      label: { de: 'Aus Ereignis', en: 'From event', fr: 'De l’événement' },
                      type: 'relationship',
                      relationTo: 'story-events',
                      admin: {
                        width: '50%',
                        description: {
                          de: 'Erscheint nie vor diesem Ereignis.',
                          en: 'Never appears before this event.',
                          fr: 'N’apparaît jamais avant cet événement.',
                        },
                      },
                    },
                  ],
                },
                {
                  name: 'text',
                  label: { de: 'Text', en: 'Text', fr: 'Texte' },
                  type: 'textarea',
                  localized: true,
                  required: true,
                  admin: { rows: 3 },
                },
              ],
            },
          ],
        },
        {
          label: { de: 'Beziehungen', en: 'Relationships', fr: 'Relations' },
          fields: [
            {
              name: 'relations',
              label: { de: 'Beziehungen', en: 'Relationships', fr: 'Relations' },
              labels: {
                singular: { de: 'Beziehung', en: 'Relationship', fr: 'Relation' },
                plural: { de: 'Beziehungen', en: 'Relationships', fr: 'Relations' },
              },
              type: 'array',
              fields: [
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'figure',
                      label: { de: 'Zu Figur', en: 'To figure', fr: 'Avec' },
                      type: 'relationship',
                      relationTo: 'story-figures',
                      required: true,
                      admin: { width: '50%' },
                    },
                    visibleFromField(
                      {
                        de: 'Leer: sobald beide Figuren sichtbar sind.',
                        en: 'Empty: once both figures are visible.',
                        fr: 'Vide : dès que les deux personnages sont visibles.',
                      },
                      { required: false, sidebar: false, width: '50%' },
                    ),
                  ],
                },
                {
                  name: 'description',
                  label: { de: 'Beziehung', en: 'Relationship', fr: 'Relation' },
                  type: 'text',
                  localized: true,
                  required: true,
                  admin: { placeholder: 'Misstraut ihr seit dem Diebstahl' },
                },
              ],
            },
          ],
        },
        {
          label: { de: 'Kommt vor in', en: 'Appears in', fr: 'Apparaît dans' },
          fields: [
            {
              name: 'appearsIn',
              type: 'ui',
              admin: {
                components: {
                  Field:
                    '@/features/story/payload-cms/components/story-links-field#StoryLinksField',
                },
              },
            },
          ],
        },
      ],
    },
    {
      name: 'photo',
      label: { de: 'Foto', en: 'Photo', fr: 'Photo' },
      type: 'upload',
      relationTo: 'story-images',
      admin: {
        position: 'sidebar',
        description: {
          de: 'Nur Leitende sehen es, und erst wenn die Figur sichtbar ist.',
          en: 'Only Leitende see it, and only once the figure is visible.',
          fr: 'Seuls les responsables la voient, et seulement quand le personnage est visible.',
        },
      },
    },
    visibleFromField({
      de: 'Vorher fehlt die Figur ganz: in der Story, bei Ereignissen und bei Challenges.',
      en: 'Before then the figure does not exist in the app at all.',
      fr: 'Avant, le personnage n’existe pas dans l’app.',
    }),
  ],
};
