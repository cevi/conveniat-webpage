import { environmentVariables } from '@/config/environment-variables';
import { HOF_ORDER_TYPE_LABELS } from '@/features/hof-dashboard/constants';
import { areaOptions, submissionTypeOptions } from '@/features/hof-dashboard/payload-cms/options';
import { canReviewHofDashboard } from '@/features/payload-cms/payload-cms/access-rules/can-access-hof-dashboard';
import { AdminPanelDashboardGroups } from '@/features/payload-cms/payload-cms/admin-panel-dashboard-groups';
import { LOCALE } from '@/features/payload-cms/payload-cms/locales';
import { getValidationMessage } from '@/features/payload-cms/payload-cms/utils/validation-messages';
import type { StaticTranslationString } from '@/types/types';
import type {
  ArrayField,
  Field,
  GlobalConfig,
  PayloadRequest,
  TextFieldSingleValidation,
} from 'payload';

/** Every row of the settings as stored in German, by its id, read once per request. */
const germanRows = (request: PayloadRequest): Promise<Map<string, Record<string, unknown>>> => {
  const cached = request.context['hofSettingsGermanRows'];
  if (cached instanceof Promise) return cached as Promise<Map<string, Record<string, unknown>>>;
  const rows = request.payload
    // without req: the local API would switch the request being validated to German
    .findGlobal({ slug: 'hof-dashboard-settings', locale: LOCALE.DE, depth: 0 })
    .then((settings) => {
      const byId = new Map<string, Record<string, unknown>>();
      const collect = (value: unknown): void => {
        if (Array.isArray(value)) {
          for (const row of value as unknown[]) {
            if (typeof row === 'object' && row !== null) {
              const rowId = (row as { id?: unknown }).id;
              if (typeof rowId === 'string') byId.set(rowId, row as Record<string, unknown>);
            }
            collect(row);
          }
        } else if (typeof value === 'object' && value !== null) {
          for (const nested of Object.values(value)) collect(nested);
        }
      };
      collect(settings);
      return byId;
    });
  request.context['hofSettingsGermanRows'] = rows;
  return rows;
};

const hasText = (value: unknown): boolean => typeof value === 'string' && value.trim() !== '';

/**
 * Required in German only. The texts fall back to German for French and English readers, and
 * the site does not fall back on its own, so Payload's own check would ask for every text in
 * every language before anything could be saved in French. A custom validate replaces it.
 *
 * In French or English, a row still without its German text is refused as well: it would show
 * German readers an empty line, and block the next German save of anything else.
 */
// `name`, not `path`: Payload leaves `path` out of the checks it runs while the form is edited
const requiredInGerman: TextFieldSingleValidation = async (value, { req, siblingData, name }) => {
  if (req.locale === LOCALE.DE) {
    return (
      hasText(value) ||
      getValidationMessage(req.i18n.language, {
        en: 'Required in German.',
        de: 'Auf Deutsch erforderlich.',
        fr: 'Obligatoire en allemand.',
      })
    );
  }

  const rowId = (siblingData as { id?: unknown }).id;
  if (typeof rowId !== 'string') return true;
  const rows = await germanRows(req);
  const germanRow = rows.get(rowId);
  return (
    hasText(germanRow?.[name]) ||
    getValidationMessage(req.i18n.language, {
      en: 'Missing in German. Add new entries in German first, then translate them.',
      de: 'Fehlt auf Deutsch. Neue Einträge zuerst auf Deutsch erfassen, dann übersetzen.',
      fr: "Manque en allemand. Crée d'abord les nouvelles entrées en allemand, puis traduis-les.",
    })
  );
};

/**
 * Rows named after their own fields, and buttons that say what they add, for the
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
            validate: requiredInGerman,
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
                  en: 'An open submission works towards the next deadline that lists it and is overdue from the first one it misses. A revision the Ressort asks for works towards the next deadline.',
                  de: 'Eine offene Abgabe richtet sich nach dem nächsten Termin, der sie aufführt, und ist ab dem ersten verpassten überfällig. Eine vom Ressort verlangte Überarbeitung richtet sich nach dem nächsten Termin.',
                  fr: 'Un dépôt ouvert vise la prochaine échéance qui le mentionne et est en retard dès la première manquée. Une révision demandée par le Ressort vise l’échéance suivante.',
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
                      validate: requiredInGerman,
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
              label: HOF_ORDER_TYPE_LABELS.infrastructure,
              fields: materialListFields(),
            },
            {
              name: 'stadtlebenOrder',
              type: 'group',
              label: HOF_ORDER_TYPE_LABELS.stadtleben,
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
                  validate: requiredInGerman,
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
