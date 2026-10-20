import { AdminPanelDashboardGroups } from '@/features/payload-cms/payload-cms/admin-panel-dashboard-groups';
import { mapAnnotationDescriptionLexicalEditorSettings } from '@/features/payload-cms/payload-cms/collections/camp-map-collection';
import { makeInjectEnrollmentCount } from '@/features/payload-cms/payload-cms/components/filled-status/inject-enrollment-count';
import { LastEditedByUserField } from '@/features/payload-cms/payload-cms/shared-fields/last-edited-by-user-field';
import { flushPageCacheOnChange } from '@/features/payload-cms/payload-cms/utils/flush-page-cache-on-change';
import { patchRichTextLinkHook } from '@/features/payload-cms/payload-cms/utils/link-field-logic';
import { getValidationMessage } from '@/features/payload-cms/payload-cms/utils/validation-messages';
import type { CampScheduleEntry } from '@/features/payload-cms/payload-types';
import { CourseType } from '@/lib/prisma';
import type { CollectionAfterReadHook, CollectionConfig, TextFieldSingleValidation } from 'payload';

import { hasAdminOrWebAccess } from '@/features/payload-cms/payload-cms/access-rules/roles';
import { campScheduleOrganiserExportHandler } from '@/features/payload-cms/payload-cms/endpoints/course-organiser-export';
import { courseParticipantsExportHandler } from '@/features/payload-cms/payload-cms/endpoints/course-participants-export';
import { handleParticipantMutation } from '@/features/payload-cms/payload-cms/endpoints/course-participants-manager';
import { syncOrganisers } from '@/features/payload-cms/payload-cms/utils/sync-organisers';

/**
 * Set on a request that may read the part of a block written for Leitende. The schedule's
 * `getLeaderNotes` query sets it after it has checked who is asking.
 */
export const LEADER_NOTES_CONTEXT = 'scheduleLeaderNotes';

/**
 * Material, safety notes and attachments are for the people running a block. The app reads
 * blocks through the local API, which skips field access, so the list, the map and every other
 * reader would hand them to all participants. Removing them here keeps each of those readers
 * safe without knowing about it; editors still get them, or saving in the admin panel would
 * empty the fields.
 *
 * On the collection, not on the `leaders` group: Payload reads the fields of a group after the
 * group's own `afterRead` hook and fills the group back in, so a hook there removes nothing.
 */
export const hideLeaderNotes: CollectionAfterReadHook<CampScheduleEntry> = ({ doc, req }) => {
  if (req.context[LEADER_NOTES_CONTEXT] === true) return doc;
  if (req.user !== null && hasAdminOrWebAccess({ req })) return doc;

  const publicPart = { ...doc };
  delete publicPart.leaders;
  return publicPart;
};

export const CampScheduleEntryCollection: CollectionConfig = {
  slug: 'camp-schedule-entry',
  trash: true,
  hooks: {
    afterChange: [flushPageCacheOnChange, syncOrganisers],
    afterRead: [hideLeaderNotes, makeInjectEnrollmentCount(CourseType.PROGRAM)],
  },
  endpoints: [
    {
      path: '/organiser-export',
      method: 'get',
      handler: campScheduleOrganiserExportHandler,
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
      en: 'Camp Schedule Entry',
      de: 'Lager-Programmblock',
      fr: 'Entrée du programme du camp',
    },
    plural: {
      en: 'Camp Schedule Entries',
      de: 'Lager-Programmblöcke',
      fr: 'Entrées du programme du camp',
    },
  },
  admin: {
    useAsTitle: 'title',
    group: AdminPanelDashboardGroups.AppCampsite.label,
    groupBy: true,
    disableCopyToLocale: true,
    defaultColumns: [
      'title',
      'timeslot',
      'quartiere',
      'location',
      'participants_max',
      'enrolledStatus',
    ],
    components: {
      beforeListTable: [
        '@/features/payload-cms/payload-cms/components/camp-schedule-organiser-export#CampScheduleOrganiserExport',
      ],
    },
  },
  access: {
    read: hasAdminOrWebAccess,
    create: hasAdminOrWebAccess,
    update: hasAdminOrWebAccess,
    delete: hasAdminOrWebAccess,
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
              admin: {
                description: {
                  en: 'The title of the entry.',
                  de: 'Der Titel des Eintrags.',
                  fr: "Le titre de l'entrée.",
                },
              },
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'kind',
                  label: { en: 'Kind', de: 'Art', fr: 'Type' },
                  type: 'select',
                  required: true,
                  defaultValue: 'program',
                  options: [
                    {
                      value: 'program',
                      label: {
                        en: 'Programme block',
                        de: 'Programmblock',
                        fr: 'Bloc de programme',
                      },
                    },
                    {
                      value: 'fixpoint',
                      label: { en: 'Fixed point', de: 'Fixpunkt', fr: 'Point fixe' },
                    },
                    { value: 'meal', label: { en: 'Meal', de: 'Essen', fr: 'Repas' } },
                    {
                      value: 'transfer',
                      label: { en: 'Transfer', de: 'Verschiebung', fr: 'Déplacement' },
                    },
                  ],
                  admin: {
                    description: {
                      en: 'Only programme blocks get a card and a detail page. Fixed points (e.g. Tagwache, Nachtruhe), meals and transfers show as a single compact line.',
                      de: 'Nur Programmblöcke erhalten eine Karte und eine Detailseite. Fixpunkte (z.B. Tagwache, Nachtruhe), Essen und Verschiebungen erscheinen als einzelne kompakte Zeile.',
                      fr: "Seuls les blocs de programme ont une carte et une page de détail. Les points fixes (p. ex. Tagwache, Nachtruhe), les repas et les déplacements s'affichent sur une seule ligne compacte.",
                    },
                  },
                },
                {
                  name: 'form',
                  label: { en: 'Form', de: 'Form', fr: 'Forme' },
                  type: 'select',
                  options: [
                    {
                      value: 'rp',
                      label: {
                        en: 'RP (Ressortprogramm)',
                        de: 'RP (Ressortprogramm)',
                        fr: 'RP (Ressortprogramm)',
                      },
                    },
                    {
                      value: 'hp',
                      label: {
                        en: 'HP (Hofprogramm)',
                        de: 'HP (Hofprogramm)',
                        fr: 'HP (Hofprogramm)',
                      },
                    },
                    {
                      value: 'hpStar',
                      label: {
                        en: 'HP* (written by the Ressort, run by the Hof)',
                        de: 'HP* (vom Ressort geschrieben, vom Hof durchgeführt)',
                        fr: 'HP* (écrit par le Ressort, réalisé par le Hof)',
                      },
                    },
                  ],
                  admin: {
                    condition: (data) => (data['kind'] ?? 'program') === 'program',
                    description: {
                      en: 'Who plans and runs the block. Shown next to the category.',
                      de: 'Wer den Block plant und durchführt. Wird neben der Kategorie angezeigt.',
                      fr: 'Qui planifie et réalise le bloc. Affiché à côté de la catégorie.',
                    },
                  },
                },
              ],
            },
            {
              name: 'description',
              label: {
                en: 'Description',
                de: 'Beschreibung',
                fr: 'Description',
              },
              type: 'richText',
              required: true,
              localized: true,
              admin: {
                description: {
                  en: 'The description of the entry',
                  de: 'Die Beschreibung des Eintrags',
                  fr: "La description de l'entrée",
                },
              },
              editor: mapAnnotationDescriptionLexicalEditorSettings,
              hooks: patchRichTextLinkHook,
            },
            {
              name: 'timeslot',
              label: {
                en: 'Time Slot',
                de: 'Zeitfenster',
                fr: 'Créneau horaire',
              },
              type: 'group',
              admin: {
                description: {
                  en: 'Time slots for the schedule entry',
                  de: 'Zeitfenster für den Programmeintrag',
                  fr: 'Créneaux horaires pour l’entrée du programme',
                },
              },
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
            {
              name: 'target_group',
              label: {
                en: 'Target Group',
                de: 'Zielgruppe',
                fr: 'Groupe cible',
              },
              type: 'richText',
              localized: true,
              editor: mapAnnotationDescriptionLexicalEditorSettings,
            },
          ],
        },
        {
          label: { en: 'Schedule of the block', de: 'Ablauf', fr: 'Déroulement' },
          fields: [
            {
              name: 'bring',
              label: { en: 'What to bring', de: 'Mitnehmen', fr: 'À emporter' },
              labels: {
                singular: { en: 'Item', de: 'Gegenstand', fr: 'Objet' },
                plural: { en: 'Items', de: 'Gegenstände', fr: 'Objets' },
              },
              type: 'array',
              localized: true,
              admin: {
                description: {
                  en: 'What participants bring to the block, one item per row, e.g. "Trinkflasche".',
                  de: 'Was die Teilnehmenden zum Block mitnehmen, ein Gegenstand pro Zeile, z.B. "Trinkflasche".',
                  fr: 'Ce que les participants emportent au bloc, un objet par ligne, p. ex. « Trinkflasche ».',
                },
              },
              fields: [
                {
                  name: 'item',
                  label: { en: 'Item', de: 'Gegenstand', fr: 'Objet' },
                  type: 'text',
                  required: true,
                },
              ],
            },
            {
              name: 'steps',
              label: { en: 'Steps', de: 'Ablauf', fr: 'Déroulement' },
              labels: {
                singular: { en: 'Step', de: 'Schritt', fr: 'Étape' },
                plural: { en: 'Steps', de: 'Schritte', fr: 'Étapes' },
              },
              type: 'array',
              localized: true,
              admin: {
                description: {
                  en: 'The steps of the block in order. The app works out the clock times from the start of the block and the durations, so one description fits every Quartier.',
                  de: 'Die Schritte des Blocks in ihrer Reihenfolge. Die App berechnet die Uhrzeiten aus dem Beginn des Blocks und den Dauern, so passt ein Beschrieb für jedes Quartier.',
                  fr: "Les étapes du bloc dans l'ordre. L'app calcule les heures à partir du début du bloc et des durées, ainsi une description convient à chaque Quartier.",
                },
              },
              fields: [
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'phase',
                      label: { en: 'Part', de: 'Teil', fr: 'Partie' },
                      type: 'select',
                      required: true,
                      defaultValue: 'main',
                      options: [
                        {
                          value: 'intro',
                          label: { en: 'Introduction', de: 'Einstieg', fr: 'Introduction' },
                        },
                        {
                          value: 'main',
                          label: { en: 'Main part', de: 'Hauptteil', fr: 'Partie principale' },
                        },
                        { value: 'end', label: { en: 'Ending', de: 'Schluss', fr: 'Conclusion' } },
                      ],
                    },
                    {
                      name: 'duration',
                      label: {
                        en: 'Duration (minutes)',
                        de: 'Dauer (Minuten)',
                        fr: 'Durée (minutes)',
                      },
                      type: 'number',
                      required: true,
                      min: 1,
                    },
                  ],
                },
                {
                  name: 'title',
                  label: { en: 'Title', de: 'Titel', fr: 'Titre' },
                  type: 'text',
                  required: true,
                },
                {
                  name: 'text',
                  label: { en: 'Description', de: 'Beschreibung', fr: 'Description' },
                  type: 'textarea',
                },
              ],
            },
          ],
        },
        {
          label: { en: 'For Leitende', de: 'Für Leitende', fr: 'Pour les Leitende' },
          description: {
            en: 'Only Leitende and Helfende see this part in the app, participants do not.',
            de: 'Diesen Teil sehen in der App nur Leitende und Helfende, Teilnehmende nicht.',
            fr: "Seuls les Leitende et les Helfende voient cette partie dans l'app, pas les participants.",
          },
          fields: [
            {
              name: 'leaders',
              label: false,
              type: 'group',
              fields: [
                {
                  name: 'materials',
                  label: { en: 'Material list', de: 'Material-Liste', fr: 'Liste de matériel' },
                  labels: {
                    singular: { en: 'Material', de: 'Material', fr: 'Matériel' },
                    plural: { en: 'Materials', de: 'Materialien', fr: 'Matériel' },
                  },
                  type: 'array',
                  localized: true,
                  fields: [
                    {
                      type: 'row',
                      fields: [
                        {
                          name: 'amount',
                          label: { en: 'Amount', de: 'Anzahl', fr: 'Quantité' },
                          type: 'text',
                          admin: { width: '20%' },
                        },
                        {
                          name: 'item',
                          label: { en: 'What', de: 'Was', fr: 'Quoi' },
                          type: 'text',
                          required: true,
                          admin: { width: '50%' },
                        },
                        {
                          name: 'responsible',
                          label: { en: 'Who', de: 'Wer', fr: 'Qui' },
                          type: 'text',
                          admin: {
                            width: '30%',
                            description: {
                              en: 'Who provides it, e.g. "Hof" or "MAT".',
                              de: 'Wer es bereitstellt, z.B. "Hof" oder "MAT".',
                              fr: 'Qui le fournit, p. ex. « Hof » ou « MAT ».',
                            },
                          },
                        },
                      ],
                    },
                  ],
                },
                {
                  name: 'safety',
                  label: {
                    en: 'Safety considerations',
                    de: 'Sicherheitsüberlegungen',
                    fr: 'Réflexions sur la sécurité',
                  },
                  type: 'textarea',
                  localized: true,
                },
                {
                  name: 'safeguarding',
                  label: {
                    en: 'Prevention of sexual exploitation (PSA)',
                    de: 'Prävention sexueller Ausbeutung (PSA)',
                    fr: "Prévention de l'exploitation sexuelle (PSA)",
                  },
                  type: 'textarea',
                  localized: true,
                },
                {
                  name: 'badWeather',
                  label: { en: 'Bad weather', de: 'Schlechtwetter', fr: 'Mauvais temps' },
                  type: 'textarea',
                  localized: true,
                },
                {
                  name: 'attachments',
                  label: { en: 'Attachments', de: 'Beilagen', fr: 'Annexes' },
                  type: 'relationship',
                  relationTo: 'documents',
                  hasMany: true,
                  admin: {
                    description: {
                      en: 'Only the link is hidden from participants. Who may open the file itself is decided by the permission set on the document.',
                      de: 'Vor Teilnehmenden wird nur der Link verborgen. Wer die Datei selbst öffnen darf, bestimmt die Berechtigung auf dem Dokument.',
                      fr: 'Seul le lien est caché aux participants. Qui peut ouvrir le fichier lui-même dépend de la permission définie sur le document.',
                    },
                  },
                },
              ],
            },
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
        {
          label: {
            en: 'Enrollment',
            de: 'Anmeldung',
            fr: 'Inscription',
          },
          fields: [
            {
              name: 'enable_enrolment',
              label: {
                en: 'Allow User Enrolment',
                de: 'Benutzeranmeldung erlauben',
                fr: "Autoriser l'inscription des utilisateurs",
              },
              type: 'checkbox',
              defaultValue: false,
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
                condition: (data) => Boolean(data['enable_enrolment']),
              },
            },
            {
              name: 'participants_min',
              label: {
                en: 'Minimum Participants',
                de: 'Minimale Teilnehmer',
                fr: 'Participants minimum',
              },
              required: false,
              type: 'number',
              admin: {
                condition: (data) => Boolean(data['enable_enrolment']),
              },
            },
            {
              name: 'participants_max',
              label: {
                en: 'Maximum Participants',
                de: 'Maximale Teilnehmer',
                fr: 'Participants maximum',
              },
              required: false,
              type: 'number',
              admin: {
                condition: (data) => Boolean(data['enable_enrolment']),
              },
            },
          ],
        },
      ],
    },
    // Sidebar and hidden fields
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
              {
                annotationType: {
                  equals: 'marker',
                },
              },
              {
                isInteractive: {
                  not_equals: false,
                },
              },
            ],
          };
        }
        return true;
      },
      required: true,
      admin: {
        description: {
          en: 'Location of the Schedule Entry',
          de: 'Ort des Programmeintrags',
          fr: "Emplacement de l'entrée du programme",
        },
        position: 'sidebar',
      },
    },
    {
      name: 'quartiere',
      label: { en: 'Quartiere', de: 'Quartiere', fr: 'Quartiers' },
      type: 'relationship',
      relationTo: 'quartiere',
      hasMany: true,
      admin: {
        position: 'sidebar',
        description: {
          en: 'The Quartiere this entry is for. Leave empty for the whole camp. A Hof sees the entries of its Quartier.',
          de: 'Die Quartiere, für die dieser Eintrag gilt. Leer lassen für das Gesamtlager. Ein Hof sieht die Einträge seines Quartiers.',
          fr: 'Les Quartiers concernés par cette entrée. Laisser vide pour tout le camp. Un Hof voit les entrées de son Quartier.',
        },
      },
    },
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
          en: 'Organiser',
          de: 'Organisator',
          fr: 'Organisateur',
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
        position: 'sidebar',
      },
    },
    LastEditedByUserField,
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
      },
    },
  ],
};
