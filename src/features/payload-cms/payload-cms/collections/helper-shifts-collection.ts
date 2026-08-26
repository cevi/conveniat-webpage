import { AdminPanelDashboardGroups } from '@/features/payload-cms/payload-cms/admin-panel-dashboard-groups';
import { mapAnnotationDescriptionLexicalEditorSettings } from '@/features/payload-cms/payload-cms/collections/camp-map-collection';
import { makeInjectEnrollmentCount } from '@/features/payload-cms/payload-cms/components/filled-status/inject-enrollment-count';
import { helperShiftOrganiserExportHandler } from '@/features/payload-cms/payload-cms/endpoints/course-organiser-export';
import { courseParticipantsExportHandler } from '@/features/payload-cms/payload-cms/endpoints/course-participants-export';
import { handleParticipantMutation } from '@/features/payload-cms/payload-cms/endpoints/course-participants-manager';
import { helperShiftParticipationExportHandler } from '@/features/payload-cms/payload-cms/endpoints/helper-shift-participation-export';
import { accordion } from '@/features/payload-cms/payload-cms/shared-blocks/accordion';
import { fileDownloadBlock } from '@/features/payload-cms/payload-cms/shared-blocks/file-download-block';
import { richTextArticleBlock } from '@/features/payload-cms/payload-cms/shared-blocks/rich-text-article-block';
import { singlePictureBlock } from '@/features/payload-cms/payload-cms/shared-blocks/single-picture-block';
import { whiteSpaceBlock } from '@/features/payload-cms/payload-cms/shared-blocks/white-space-block';
import { mainContentField } from '@/features/payload-cms/payload-cms/shared-fields/main-content-field';
import { flushPageCacheOnChange } from '@/features/payload-cms/payload-cms/utils/flush-page-cache-on-change';
import { patchRichTextLinkHook } from '@/features/payload-cms/payload-cms/utils/link-field-logic';
import { getValidationMessage } from '@/features/payload-cms/payload-cms/utils/validation-messages';
import { DEFAULT_UNENROLLMENT_DEADLINE_MINUTES } from '@/features/schedule/utils/unenrollment-deadline';
import { CourseType } from '@/lib/prisma';
import type { BlocksField, CollectionConfig, Field, TextFieldSingleValidation } from 'payload';

export const HelperShiftsCollection: CollectionConfig = {
  slug: 'helper-shifts',
  trash: true,
  hooks: {
    afterChange: [flushPageCacheOnChange],
    afterRead: [makeInjectEnrollmentCount(CourseType.SHIFT)],
  },
  endpoints: [
    {
      path: '/participation-export',
      method: 'get',
      handler: helperShiftParticipationExportHandler,
    },
    {
      path: '/organiser-export',
      method: 'get',
      handler: helperShiftOrganiserExportHandler,
    },
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
    defaultColumns: [
      'title',
      'timeslot',
      'location',
      'category',
      'participants_max',
      'enrolledStatus',
    ],
    groupBy: true,
    disableCopyToLocale: true,
    components: {
      beforeListTable: [
        '@/features/payload-cms/payload-cms/components/helper-shift-participation-export#HelperShiftParticipationExport',
        '@/features/payload-cms/payload-cms/components/helper-shift-organiser-export#HelperShiftOrganiserExport',
      ],
    },
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
                  validate: ((
                    value: string | string[] | undefined | null,
                    options: Parameters<TextFieldSingleValidation>[1],
                  ): true | string => {
                    const localeString = options.req.i18n.language;
                    const errorMessage = getValidationMessage(localeString, {
                      en: 'Invalid time format. Use HH:mm - HH:mm.',
                      de: 'Ungültiges Zeitformat. Bitte HH:mm - HH:mm verwenden.',
                      fr: 'Format de temps invalide. Utilisez HH:mm - HH:mm.',
                    });
                    if (typeof value !== 'string') {
                      return errorMessage;
                    }
                    const timePattern = /^([01]\d|2[0-3]):([0-5]\d) - ([01]\d|2[0-3]):([0-5]\d)$/;
                    return timePattern.test(value) || errorMessage;
                  }) as TextFieldSingleValidation,
                },
              ],
            },
            ((): Field => {
              const mainContentBase = { ...(mainContentField as BlocksField) };
              delete (mainContentBase as { defaultValue?: unknown }).defaultValue;
              return {
                ...mainContentBase,
                name: 'mainContent',
                required: false,
                label: {
                  en: 'Detailed Description',
                  de: 'Detaillierte Beschreibung',
                  fr: 'Description détaillée',
                },
                admin: {
                  ...mainContentField.admin,
                  description: {
                    en: 'Detailed description of the shift (optional).',
                    de: 'Detaillierte Beschreibung des Schichteinsatzes (optional).',
                    fr: 'Description détaillée du service (optionnelle).',
                  },
                },
                blocks: [
                  richTextArticleBlock,
                  singlePictureBlock,
                  fileDownloadBlock,
                  accordion,
                  whiteSpaceBlock,
                ],
              } as Field;
            })(),
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
      name: 'organiser',
      label: {
        en: 'Organiser',
        de: 'Organisator',
        fr: 'Organisateur',
      },
      type: 'relationship',
      relationTo: 'users',
      hasMany: true,
      required: false,
      admin: {
        description: {
          en: 'Organisers of this shift. The shift shows up in their daily program automatically, they are shown to helpers as contacts, and they are the only ones who see the list of enrolled helpers in the app.',
          de: 'Organisatoren dieses Schichteinsatzes. Der Einsatz erscheint automatisch in ihrem Tagesprogramm, sie werden den Helfenden als Kontakt angezeigt und sehen als Einzige die Liste der angemeldeten Helfenden in der App.',
          fr: 'Organisateurs de ce service. Le service apparaît automatiquement dans leur programme du jour, ils sont affichés aux helpers comme contacts et sont les seuls à voir la liste des helpers inscrits dans l’app.',
        },
        position: 'sidebar',
      },
    },
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
      name: 'category',
      label: {
        en: 'Category',
        de: 'Kategorie',
        fr: 'Catégorie',
      },
      type: 'relationship',
      relationTo: 'camp-categories',
      hasMany: false,
      required: false,
      admin: {
        description: {
          en: 'Category used to tag and filter the shift in the helper portal.',
          de: 'Kategorie, mit der der Schichteinsatz im Helfenden-Portal getaggt und gefiltert wird.',
          fr: 'Catégorie utilisée pour taguer et filtrer le service dans le portail des helpers.',
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
      name: 'unenrollment_deadline_minutes',
      label: {
        en: 'Withdrawal Deadline (minutes)',
        de: 'Abmeldefrist (Minuten)',
        fr: 'Délai de désinscription (minutes)',
      },
      type: 'number',
      defaultValue: DEFAULT_UNENROLLMENT_DEADLINE_MINUTES,
      min: 0,
      admin: {
        position: 'sidebar',
        step: 5,
        description: {
          en: 'How many minutes before the shift starts helpers can no longer withdraw from it. Set to 0 to allow withdrawing until the shift begins.',
          de: 'Wie viele Minuten vor Beginn des Schichteinsatzes sich Helfende nicht mehr abmelden können. 0 erlaubt das Abmelden bis zum Beginn.',
          fr: 'Combien de minutes avant le début du service les helpers ne peuvent plus se désinscrire. 0 permet la désinscription jusqu’au début du service.',
        },
        condition: (data) => Boolean(data['enable_enrolment']),
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
      name: 'hide_when_full',
      label: {
        en: 'Hide When Full',
        de: 'Ausblenden wenn voll',
        fr: 'Masquer si complet',
      },
      type: 'checkbox',
      defaultValue: true,
      admin: {
        position: 'sidebar',
        description: {
          en: 'Hide this slot when full for users who are not enrolled in it.',
          de: 'Diesen Schichteinsatz ausblenden, wenn voll, für Personen die nicht angemeldet sind.',
          fr: 'Masquer ce service s’il est complet pour les personnes non inscrites.',
        },
        condition: (data) => Boolean(data['enable_enrolment']) && Boolean(data['participants_max']),
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
