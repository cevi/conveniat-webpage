import { AdminPanelDashboardGroups } from '@/features/payload-cms/payload-cms/admin-panel-dashboard-groups';
import { mapAnnotationDescriptionLexicalEditorSettings } from '@/features/payload-cms/payload-cms/collections/camp-map-collection';
import { makeInjectEnrollmentCount } from '@/features/payload-cms/payload-cms/components/filled-status/inject-enrollment-count';
import { courseParticipantsExportHandler } from '@/features/payload-cms/payload-cms/endpoints/course-participants-export';
import { handleParticipantMutation } from '@/features/payload-cms/payload-cms/endpoints/course-participants-manager';
import { accordion } from '@/features/payload-cms/payload-cms/shared-blocks/accordion';
import { fileDownloadBlock } from '@/features/payload-cms/payload-cms/shared-blocks/file-download-block';
import { richTextArticleBlock } from '@/features/payload-cms/payload-cms/shared-blocks/rich-text-article-block';
import { singlePictureBlock } from '@/features/payload-cms/payload-cms/shared-blocks/single-picture-block';
import { whiteSpaceBlock } from '@/features/payload-cms/payload-cms/shared-blocks/white-space-block';
import { mainContentField } from '@/features/payload-cms/payload-cms/shared-fields/main-content-field';
import { flushPageCacheOnChange } from '@/features/payload-cms/payload-cms/utils/flush-page-cache-on-change';
import { patchRichTextLinkHook } from '@/features/payload-cms/payload-cms/utils/link-field-logic';
import { CourseType } from '@/lib/prisma';
import type { CollectionConfig, Field } from 'payload';

export const HelperShiftsCollection: CollectionConfig = {
  slug: 'helper-shifts',
  trash: true,
  hooks: {
    afterChange: [flushPageCacheOnChange],
    afterRead: [makeInjectEnrollmentCount(CourseType.SHIFT)],
  },
  endpoints: [
    {
      path: '/:id/participants-export',
      method: 'get',
      handler: courseParticipantsExportHandler,
    },
    {
      path: '/:id/participants',
      method: 'post',
      handler: handleParticipantMutation,
    },
    {
      path: '/:id/participants',
      method: 'delete',
      handler: handleParticipantMutation,
    },
  ],

  labels: {
    singular: {
      en: 'Helper Shift',
      de: 'Schichteinsatz',
      fr: 'Service de helpers',
    },
    plural: {
      en: 'Helper Shifts',
      de: 'Schichteinsätze',
      fr: 'Services de helpers',
    },
  },
  admin: {
    useAsTitle: 'title',
    group: AdminPanelDashboardGroups.AppContent,
    defaultColumns: ['title', 'timeslot', 'location', 'participants_max', 'enrolledStatus'],
    groupBy: true,
    disableCopyToLocale: true,
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: {
            en: 'Details',
            de: 'Details',
            fr: 'Détails',
          },
          fields: [
            {
              name: 'title',
              label: {
                en: 'Title',
                de: 'Titel',
                fr: 'Titre',
              },
              type: 'text',
              required: true,
              localized: true,
            },
            {
              name: 'description',
              label: {
                en: 'Short Description',
                de: 'Kurzbeschreibung',
                fr: 'Description courte',
              },
              type: 'textarea',
              required: true,
              localized: true,
              admin: {
                description: {
                  en: 'A short description of the shift and what helpers will be doing.',
                  de: 'Eine kurze Beschreibung des Schichteinsatzes.',
                  fr: 'Une brève description du service.',
                },
              },
            },
            {
              name: 'meetingPoint',
              label: {
                en: 'Meeting Point',
                de: 'Treffpunkt',
                fr: 'Point de rendez-vous',
              },
              type: 'text',
              localized: true,
              admin: {
                description: {
                  en: 'Where helpers should meet before the shift starts.',
                  de: 'Wo sich die Helfenden vor dem Schichteinsatz treffen sollen.',
                  fr: 'Où les helpers doivent se retrouver avant le service.',
                },
              },
            },
            {
              name: 'timeslot',
              label: {
                en: 'Time Slot',
                de: 'Zeitfenster',
                fr: 'Créneau horaire',
              },
              type: 'group',
              required: true,
              fields: [
                {
                  name: 'date',
                  label: {
                    en: 'Date',
                    de: 'Datum',
                    fr: 'Date',
                  },
                  type: 'date',
                  required: true,
                  admin: {
                    date: {
                      pickerAppearance: 'dayOnly',
                      displayFormat: 'yyyy-MM-dd',
                    },
                  },
                },
                {
                  name: 'time',
                  label: {
                    en: 'Time',
                    de: 'Zeit',
                    fr: 'Heure',
                  },
                  type: 'text',
                  required: true,
                  admin: {
                    description: {
                      en: 'Time slots in HH:mm format (e.g., 08:00 - 18:00)',
                      de: 'Zeitfenster im HH:mm-Format (z.B. 08:00 - 18:00)',
                      fr: 'Créneaux horaires au format HH:mm (ex : 08:00 - 18:00)',
                    },
                  },
                  validate: (value: string | string[] | undefined | null): true | string => {
                    if (typeof value !== 'string') {
                      return 'Invalid time format. Use HH:mm - HH:mm.';
                    }
                    const timePattern = /^([01]\d|2[0-3]):([0-5]\d) - ([01]\d|2[0-3]):([0-5]\d)$/;
                    return timePattern.test(value) || 'Invalid time format. Use HH:mm - HH:mm.';
                  },
                },
              ],
            },
            {
              ...mainContentField,
              label: {
                en: 'Detailed Description',
                de: 'Detailierte Beschreibung',
                fr: 'Description détaillée',
              },
              admin: {
                ...mainContentField.admin,
                description: {
                  en: 'Detailed description of the shift (optional).',
                  de: 'Detailierte Beschreibung des Schichteinsatzes.',
                  fr: 'Description détaillée du service.',
                },
              },
              blocks: [
                richTextArticleBlock,
                singlePictureBlock,
                fileDownloadBlock,
                accordion,
                whiteSpaceBlock,
              ],
            } as Field,
          ],
        },
        {
          label: {
            en: 'Participants',
            de: 'Teilnehmende',
            fr: 'Participants',
          },
          fields: [
            {
              name: 'participantsList',
              type: 'ui',
              admin: {
                components: {
                  Field:
                    '@/features/payload-cms/payload-cms/components/participants-admin-ui/participants-admin-ui#ParticipantsAdminUI',
                },
              },
            },
          ],
        },
      ],
    },
    // Sidebar & hidden metrics fields
    {
      name: 'location',
      label: {
        en: 'Location',
        de: 'Ort',
        fr: 'Emplacement',
      },
      type: 'relationship',
      relationTo: 'camp-map-annotations',
      hasMany: false,
      filterOptions: ({
        relationTo,
      }):
        | boolean
        | {
            or: { annotationType?: { equals: string }; isInteractive?: { not_equals: boolean } }[];
          } => {
        if (relationTo === 'camp-map-annotations') {
          return {
            or: [
              { annotationType: { equals: 'marker' } },
              { isInteractive: { not_equals: false } },
            ],
          };
        }
        return true;
      },
      required: false,
      admin: {
        description: {
          en: 'Location of the shift (optional).',
          de: 'Ort des Schichteinsatzes (optional).',
          fr: 'Emplacement du service (optionnel).',
        },
        position: 'sidebar',
      },
    },
    {
      name: 'participants_max',
      label: {
        en: 'Maximum Helpers',
        de: 'Maximale Anzahl Helfende',
        fr: 'Nombre maximum de helpers',
      },
      type: 'number',
      required: false,
      admin: {
        description: {
          en: 'Maximum number of helpers for this shift. Leave empty for unlimited.',
          de: 'Maximale Anzahl Helfende für diesen Schichteinsatz. Leer = unbegrenzt.',
          fr: 'Nombre maximum de helpers. Vide = illimité.',
        },
        position: 'sidebar',
      },
    },
    {
      name: 'enable_enrolment',
      label: {
        en: 'Allow Enrolment',
        de: 'Anmeldung erlauben',
        fr: "Autoriser l'inscription",
      },
      type: 'checkbox',
      defaultValue: true,
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'hide_participant_list',
      label: {
        en: 'Hide Participant List',
        de: 'Teilnehmerliste ausblenden',
        fr: 'Masquer la liste des participants',
      },
      type: 'checkbox',
      defaultValue: false,
      admin: {
        position: 'sidebar',
        condition: (data) => Boolean(data['enable_enrolment']),
      },
    },
    {
      name: 'notes',
      label: {
        en: 'Internal Notes',
        de: 'Interne Notizen',
        fr: 'Notes internes',
      },
      type: 'richText',
      localized: false,
      editor: mapAnnotationDescriptionLexicalEditorSettings,
      hooks: patchRichTextLinkHook,
      admin: {
        position: 'sidebar',
        description: {
          en: 'Admin-only notes about this shift (not shown to helpers).',
          de: 'Admininterne Notizen zu diesem Schichteinsatz (nicht für Helfende sichtbar).',
          fr: 'Notes internes sur ce service (non visibles par les helpers).',
        },
      },
    },
    {
      name: 'enrolledCount',
      type: 'number',
      virtual: true,
      admin: {
        hidden: true,
      },
    },
    {
      name: 'enrolledStatus',
      type: 'ui',
      admin: {
        components: {
          Cell: '@/features/payload-cms/payload-cms/components/filled-status/filled-status-cell',
        },
        custom: {
          invertColors: true,
        },
      },
    },
  ],
};
