import { environmentVariables } from '@/config/environment-variables';
import { areaOptions, submissionTypeOptions } from '@/features/hof-dashboard/payload-cms/options';
import { canReviewHofDashboard } from '@/features/payload-cms/payload-cms/access-rules/can-access-hof-dashboard';
import { AdminPanelDashboardGroups } from '@/features/payload-cms/payload-cms/admin-panel-dashboard-groups';
import type { StaticTranslationString } from '@/types/types';
import type { ArrayField, Field, GlobalConfig } from 'payload';

/**
 * Collapsed rows named after their own fields, and buttons that say what they add, for the
 * long lists of these settings.
 */
const arrayAdmin = (
  fields: string[],
  singular: StaticTranslationString,
  plural: StaticTranslationString,
  description?: StaticTranslationString,
): Pick<ArrayField, 'labels' | 'admin'> => ({
  labels: { singular, plural },
  admin: {
    initCollapsed: true,
    ...(description === undefined ? {} : { description }),
    components: {
      RowLabel: {
        path: '@/features/hof-dashboard/payload-cms/components/fields-row-label#FieldsRowLabel',
        clientProps: { fields },
      },
    },
  },
});

const materialListFields = (): Field[] => [
  {
    name: 'deadline',
    type: 'date',
    label: { de: 'Bestellbar bis', en: 'Orderable until', fr: "Commandable jusqu'au" },
    admin: {
      date: { pickerAppearance: 'dayOnly', displayFormat: 'dd.MM.yyyy' },
      description: {
        en: 'After this day the Höfe can still see their order but no longer change it.',
        de: 'Nach diesem Tag sehen die Höfe ihre Bestellung noch, können sie aber nicht mehr ändern.',
        fr: 'Après ce jour, les Hofs voient encore leur commande mais ne peuvent plus la modifier.',
      },
    },
  },
  {
    name: 'items',
    type: 'array',
    label: { de: 'Material', en: 'Material', fr: 'Matériel' },
    ...arrayAdmin(
      ['name', 'section'],
      { de: 'Material', en: 'Material', fr: 'Matériel' },
      { de: 'Material', en: 'Material', fr: 'Matériel' },
      {
        en: 'Removing a line keeps it on the orders already placed, under the name it had then.',
        de: 'Eine gelöschte Zeile bleibt in bereits abgegebenen Bestellungen unter ihrem damaligen Namen erhalten.',
        fr: 'Une ligne supprimée reste dans les commandes déjà passées, sous le nom qu’elle avait alors.',
      },
    ),
    fields: [
      {
        type: 'row',
        fields: [
          {
            name: 'name',
            type: 'text',
            required: true,
            localized: true,
            label: { de: 'Material', en: 'Material', fr: 'Matériel' },
            admin: { width: '60%' },
          },
          {
            name: 'section',
            type: 'text',
            localized: true,
            label: { de: 'Rubrik', en: 'Section', fr: 'Rubrique' },
            admin: {
              width: '40%',
              description: {
                en: 'Optional heading the line is listed under, e.g. "Wood".',
                de: 'Optionale Überschrift, unter der die Zeile erscheint, z.B. "Holz".',
                fr: 'Titre facultatif sous lequel la ligne apparaît, p. ex. « Bois ».',
              },
            },
          },
        ],
      },
    ],
  },
];

/**
 * What every Hof dashboard shows alike: the deadlines, the material that can be ordered, the
 * documents to download and the safety risk criteria. What differs per Hof lives on the Hof
 * and on its submissions.
 */
export const HofDashboardSettingsGlobal: GlobalConfig = {
  slug: 'hof-dashboard-settings',
  typescript: { interface: 'HofDashboardSetting' },
  label: {
    de: 'Hof-Dashboard Einstellungen',
    en: 'Hof dashboard settings',
    fr: 'Paramètres du tableau de bord des Hofs',
  },
  admin: {
    group: AdminPanelDashboardGroups.BackofficeHofDashboard.label,
    hidden: (): boolean => !environmentVariables.FEATURE_ENABLE_HOF_DASHBOARD,
    description: {
      en: 'Texts are only required in German; French and English fall back to it.',
      de: 'Texte sind nur auf Deutsch nötig; Französisch und Englisch fallen darauf zurück.',
      fr: 'Les textes ne sont requis qu’en allemand ; le français et l’anglais s’y rabattent.',
    },
  },
  access: {
    read: canReviewHofDashboard,
    update: canReviewHofDashboard,
  },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: { de: 'Termine', en: 'Deadlines', fr: 'Échéances' },
          fields: [
            {
              name: 'deadlines',
              type: 'array',
              label: { de: 'Termine', en: 'Deadlines', fr: 'Échéances' },
              ...arrayAdmin(
                ['date', 'title'],
                { de: 'Termin', en: 'Deadline', fr: 'Échéance' },
                { de: 'Termine', en: 'Deadlines', fr: 'Échéances' },
                {
                  en: 'Each submission works towards the next deadline that lists it. Once the last one has passed, an open submission is overdue.',
                  de: 'Jede Abgabe richtet sich nach dem nächsten Termin, der sie aufführt. Ist der letzte vorbei, ist eine offene Abgabe überfällig.',
                  fr: 'Chaque dépôt vise la prochaine échéance qui le mentionne. Une fois la dernière passée, un dépôt ouvert est en retard.',
                },
              ),
              fields: [
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'date',
                      type: 'date',
                      required: true,
                      label: { de: 'Datum', en: 'Date', fr: 'Date' },
                      admin: {
                        width: '30%',
                        date: { pickerAppearance: 'dayOnly', displayFormat: 'dd.MM.yyyy' },
                      },
                    },
                    {
                      name: 'title',
                      type: 'text',
                      required: true,
                      localized: true,
                      label: { de: 'Titel', en: 'Title', fr: 'Titre' },
                      admin: { width: '50%' },
                    },
                    {
                      name: 'area',
                      type: 'select',
                      required: true,
                      options: areaOptions,
                      label: { de: 'Bereich', en: 'Area', fr: 'Domaine' },
                      admin: { width: '20%' },
                    },
                  ],
                },
                {
                  name: 'submissionTypes',
                  type: 'select',
                  hasMany: true,
                  options: submissionTypeOptions,
                  label: {
                    de: 'Betroffene Abgaben',
                    en: 'Submissions due',
                    fr: 'Dépôts concernés',
                  },
                },
              ],
            },
          ],
        },
        {
          label: { de: 'Materialbestellungen', en: 'Material orders', fr: 'Commandes' },
          fields: [
            {
              name: 'infrastructureOrder',
              type: 'group',
              label: {
                de: 'Materialbestellung Hof-Infrastruktur',
                en: 'Material order Hof infrastructure',
                fr: "Commande de matériel pour l'infrastructure du Hof",
              },
              fields: materialListFields(),
            },
            {
              name: 'stadtlebenOrder',
              type: 'group',
              label: {
                de: 'Materialbestellung Stadtleben',
                en: 'Material order Stadtleben',
                fr: 'Commande de matériel Stadtleben',
              },
              admin: {
                description: {
                  en: 'The Höfe are also asked whether they need a power connection.',
                  de: 'Die Höfe werden zusätzlich gefragt, ob sie einen Stromanschluss brauchen.',
                  fr: 'Les Hofs indiquent en plus s’ils ont besoin d’un raccordement électrique.',
                },
              },
              fields: materialListFields(),
            },
          ],
        },
        {
          label: { de: 'Stadtleben', en: 'Stadtleben', fr: 'Stadtleben' },
          fields: [
            {
              name: 'stadtlebenForm',
              type: 'relationship',
              relationTo: 'forms',
              label: {
                de: 'Formular Standanmeldung Stadtleben',
                en: 'Stadtleben stand registration form',
                fr: "Formulaire d'inscription de stand Stadtleben",
              },
              admin: {
                description: {
                  en: 'Its submissions are listed on the dashboard of the Hof they are linked to. Link a submission in its sidebar, or let the form ask with a "Hof Selection" field.',
                  de: 'Die Antworten erscheinen auf dem Dashboard des Hofs, mit dem sie verknüpft sind. Verknüpft wird in der Seitenleiste der Antwort oder über ein Feld "Hof Auswahl" im Formular.',
                  fr: 'Ses réponses apparaissent sur le tableau de bord du Hof auquel elles sont liées. Le lien se fait dans la barre latérale de la réponse ou par un champ « Sélection du Hof » dans le formulaire.',
                },
              },
            },
            {
              name: 'stadtlebenTitleFieldName',
              type: 'text',
              defaultValue: 'name',
              label: {
                de: 'Feldname für den Titel',
                en: 'Field name for the title',
                fr: 'Nom du champ pour le titre',
              },
              admin: {
                description: {
                  en: 'The form field whose answer names a submission on the dashboard, e.g. the name of the stand.',
                  de: 'Das Formularfeld, dessen Antwort eine Anmeldung auf dem Dashboard benennt, z.B. der Name des Standes.',
                  fr: 'Le champ du formulaire dont la réponse nomme une inscription sur le tableau de bord, p. ex. le nom du stand.',
                },
              },
            },
            {
              name: 'stadtlebenFormUrl',
              type: 'text',
              localized: true,
              label: {
                de: 'Seite mit dem Formular',
                en: 'Page with the form',
                fr: 'Page du formulaire',
              },
              admin: {
                description: {
                  en: 'Relative path, e.g. /stadtleben. The dashboard links to it for a new registration.',
                  de: 'Relativer Pfad, z.B. /stadtleben. Das Dashboard verlinkt darauf für eine neue Anmeldung.',
                  fr: 'Chemin relatif, p. ex. /stadtleben. Le tableau de bord y renvoie pour une nouvelle inscription.',
                },
              },
            },
            {
              name: 'stadtlebenDeadline',
              type: 'date',
              label: {
                de: 'Abgabe Planung Stadtleben',
                en: 'Stadtleben planning due',
                fr: 'Échéance planification Stadtleben',
              },
              admin: { date: { pickerAppearance: 'dayOnly', displayFormat: 'dd.MM.yyyy' } },
            },
          ],
        },
        {
          label: { de: 'Dokumente', en: 'Documents', fr: 'Documents' },
          fields: [
            {
              name: 'documents',
              type: 'array',
              labels: {
                singular: { de: 'Dokument', en: 'Document', fr: 'Document' },
                plural: { de: 'Dokumente', en: 'Documents', fr: 'Documents' },
              },
              label: {
                de: 'Offizielle Unterlagen & Vorlagen',
                en: 'Official documents & templates',
                fr: 'Documents officiels et modèles',
              },
              fields: [
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'document',
                      type: 'upload',
                      relationTo: 'documents',
                      required: true,
                      label: { de: 'Dokument', en: 'Document', fr: 'Document' },
                      admin: { width: '70%' },
                    },
                    {
                      name: 'area',
                      type: 'select',
                      options: areaOptions,
                      label: { de: 'Bereich', en: 'Area', fr: 'Domaine' },
                      admin: { width: '30%' },
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          label: { de: 'Sicherheitsrisiko', en: 'Safety risk', fr: 'Risque de sécurité' },
          fields: [
            {
              name: 'safetyRiskCriteria',
              type: 'array',
              label: {
                de: 'Kriterien für erhöhtes Sicherheitsrisiko',
                en: 'Criteria for an elevated safety risk',
                fr: 'Critères de risque de sécurité accru',
              },
              ...arrayAdmin(
                ['criterion'],
                { de: 'Kriterium', en: 'Criterion', fr: 'Critère' },
                { de: 'Kriterien', en: 'Criteria', fr: 'Critères' },
                {
                  en: 'Shown when a Hof opens the info next to "Elevated safety risk?".',
                  de: 'Erscheinen, wenn ein Hof die Info neben "Erhöhtes Sicherheitsrisiko?" öffnet.',
                  fr: 'Affichés lorsqu’un Hof ouvre l’info à côté de « Risque de sécurité accru ? ».',
                },
              ),
              fields: [
                {
                  name: 'criterion',
                  type: 'text',
                  required: true,
                  localized: true,
                  label: { de: 'Kriterium', en: 'Criterion', fr: 'Critère' },
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};
