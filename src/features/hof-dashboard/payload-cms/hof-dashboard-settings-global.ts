import { environmentVariables } from '@/config/environment-variables';
import { resolveHofDashboardAreas } from '@/features/hof-dashboard/api/hof-dashboard-areas';
import { DEFAULT_HOF_DASHBOARD_AREAS } from '@/features/hof-dashboard/constants';
import { hofAreaField, unknownAreaMessage } from '@/features/hof-dashboard/payload-cms/area-field';
import { areaIconOptions } from '@/features/hof-dashboard/payload-cms/options';
import { canReviewHofDashboard } from '@/features/payload-cms/payload-cms/access-rules/can-access-hof-dashboard';
import { AdminPanelDashboardGroups } from '@/features/payload-cms/payload-cms/admin-panel-dashboard-groups';
import { LOCALE } from '@/features/payload-cms/payload-cms/locales';
import { getValidationMessage } from '@/features/payload-cms/payload-cms/utils/validation-messages';
import type { Locale, StaticTranslationString } from '@/types/types';
import type {
  ArrayField,
  ArrayFieldValidation,
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
        path: '@/features/payload-cms/payload-cms/components/fields-row-label#FieldsRowLabel',
        clientProps: { fields },
      },
    },
  },
});

/** Most forms named when a removed tab is still in use; the editor needs a few to start. */
const NAMED_FORMS = 5;

/**
 * A tab can only go once nothing uses it: a form, deadline or document of a removed tab would
 * vanish from every dashboard without a word, the Höfe's submissions with it.
 */
const keepsUsedAreas: ArrayFieldValidation = async (value, { data, previousValue, req }) => {
  if (!Array.isArray(value)) return true;
  const kept = new Set(resolveHofDashboardAreas(value).map((area) => area.id));
  // settings never saved with tabs had the default ones
  const removed = resolveHofDashboardAreas(previousValue)
    .map((area) => area.id)
    .filter((area) => !kept.has(area));
  if (removed.length === 0) return true;

  const settings = data as { deadlines?: { area?: unknown }[]; documents?: { area?: unknown }[] };
  const usedHere = [...(settings.deadlines ?? []), ...(settings.documents ?? [])].some(
    (entry) => typeof entry.area === 'string' && removed.includes(entry.area),
  );
  // without req, as above
  const { docs: forms } = await req.payload.find({
    collection: 'forms',
    where: { 'hofDashboard.area': { in: removed } },
    depth: 0,
    limit: NAMED_FORMS,
    overrideAccess: true,
    select: { title: true },
  });
  if (forms.length === 0 && !usedHere) return true;

  const users = forms.map((form) => `«${form.title}»`);
  if (usedHere) {
    users.push(
      getValidationMessage(req.i18n.language, {
        en: 'deadlines or documents here',
        de: 'Termine oder Dokumente hier',
        fr: 'des échéances ou documents ici',
      }),
    );
  }
  return getValidationMessage(req.i18n.language, {
    en: `A removed tab is still used by ${users.join(', ')}. Pick another tab there first.`,
    de: `Ein entfernter Reiter wird noch verwendet von ${users.join(', ')}. Dort zuerst einen anderen Reiter wählen.`,
    fr: `Un onglet supprimé est encore utilisé par ${users.join(', ')}. Choisis d’abord un autre onglet là-bas.`,
  });
};

/** A tab of these settings, as they are being saved. */
const isAreaOfSettings =
  (required: boolean): TextFieldSingleValidation =>
  (value, { data, req }) => {
    if (value === null || value === undefined || value === '') {
      return !required || req.t('validation:required');
    }
    return (
      resolveHofDashboardAreas((data as { areas?: unknown }).areas).some(
        (area) => area.id === value,
      ) || unknownAreaMessage(req.i18n.language)
    );
  };

const isLocale = (value: unknown): value is Locale =>
  value === LOCALE.DE || value === LOCALE.FR || value === LOCALE.EN;

/**
 * The tabs the dashboard always had, in the language they are read in. Payload fills them in
 * for settings never saved with tabs, so the first save keeps their ids, which forms, deadlines
 * and documents already store.
 */
const defaultAreaRows = ({ locale }: { locale?: string }): Record<string, unknown>[] =>
  DEFAULT_HOF_DASHBOARD_AREAS.map(({ id, label, icon }) => ({
    id,
    icon,
    // read with every locale, a localized field is the object of its translations
    label: locale === 'all' ? label : label[isLocale(locale) ? locale : LOCALE.DE],
  }));

/**
 * What every Hof dashboard shows alike: the camp's deadlines and the documents to download.
 * What a Hof hands in are forms linked to the dashboard, set up on each form; what differs per
 * Hof lives on the Hof and on its submissions.
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
    group: AdminPanelDashboardGroups.BackofficeHoefeAndMaterial.label,
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
          label: { de: 'Reiter', en: 'Tabs', fr: 'Onglets' },
          fields: [
            {
              name: 'areas',
              type: 'array',
              label: { de: 'Reiter', en: 'Tabs', fr: 'Onglets' },
              defaultValue: defaultAreaRows,
              validate: keepsUsedAreas,
              ...arrayAdmin(
                ['label'],
                { de: 'Reiter', en: 'Tab', fr: 'Onglet' },
                { de: 'Reiter', en: 'Tabs', fr: 'Onglets' },
                {
                  en: 'The dashboard’s tabs in their order, between "Overview" and "Documents". A form picks its tab under "Hof dashboard", a deadline or document here. A tab still in use cannot be removed. The forms of "Material" are the material orders the Ressort confirms one by one.',
                  de: 'Die Reiter des Dashboards in ihrer Reihenfolge, zwischen «Übersicht» und «Dokumente». Ein Formular wählt seinen Reiter unter «Hof-Dashboard», ein Termin oder Dokument hier. Ein Reiter, der noch verwendet wird, lässt sich nicht entfernen. Die Formulare unter «Material» sind die Materialbestellungen, die das Ressort einzeln bestätigt.',
                  fr: 'Les onglets du tableau de bord dans leur ordre, entre « Aperçu » et « Documents ». Un formulaire choisit son onglet sous « Tableau de bord du Hof », une échéance ou un document ici. Un onglet encore utilisé ne peut pas être supprimé. Les formulaires de « Matériel » sont les commandes de matériel que le Ressort confirme une à une.',
                },
              ),
              fields: [
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'label',
                      type: 'text',
                      required: true,
                      validate: requiredInGerman,
                      localized: true,
                      label: { de: 'Name', en: 'Name', fr: 'Nom' },
                      admin: { width: '70%' },
                    },
                    {
                      name: 'icon',
                      type: 'select',
                      required: true,
                      defaultValue: 'clipboard-list',
                      options: areaIconOptions,
                      label: { de: 'Symbol', en: 'Icon', fr: 'Icône' },
                      admin: { width: '30%' },
                    },
                  ],
                },
              ],
            },
          ],
        },
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
                  en: 'The camp’s milestones, shown on every dashboard. A form’s own due date is set on the form.',
                  de: 'Die Meilensteine des Lagers, auf jedem Dashboard. Den Abgabetermin eines Formulars setzt man beim Formular.',
                  fr: 'Les jalons du camp, sur chaque tableau de bord. L’échéance d’un formulaire se règle sur le formulaire.',
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
                    hofAreaField({
                      name: 'area',
                      required: true,
                      validate: isAreaOfSettings(true),
                      label: { de: 'Reiter', en: 'Tab', fr: 'Onglet' },
                      width: '20%',
                    }),
                  ],
                },
              ],
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
                    hofAreaField({
                      name: 'area',
                      validate: isAreaOfSettings(false),
                      label: { de: 'Reiter', en: 'Tab', fr: 'Onglet' },
                      width: '30%',
                    }),
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    {
      // written by the Excel export of the material orders alone, so the Ressort sees which
      // orders changed after it; one time per form, since a form can be exported on its own
      name: 'materialOrderExports',
      type: 'array',
      label: {
        de: 'Letzter Export der Materialbestellungen',
        en: 'Last export of the material orders',
        fr: 'Dernier export des commandes de matériel',
      },
      labels: {
        singular: { de: 'Export', en: 'Export', fr: 'Export' },
        plural: { de: 'Exporte', en: 'Exports', fr: 'Exports' },
      },
      access: { create: () => false, update: () => false },
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: {
          de: 'Wird beim Excel-Export im Hof-Dashboard gesetzt.',
          en: 'Set by the Excel export on the Hof dashboard.',
          fr: 'Mis à jour par l’export Excel du tableau de bord des Hofs.',
        },
      },
      fields: [
        {
          name: 'form',
          type: 'relationship',
          relationTo: 'forms',
          required: true,
          label: { de: 'Formular', en: 'Form', fr: 'Formulaire' },
        },
        {
          name: 'exportedAt',
          type: 'date',
          required: true,
          label: { de: 'Exportiert am', en: 'Exported on', fr: 'Exporté le' },
          admin: { date: { pickerAppearance: 'dayAndTime', displayFormat: 'dd.MM.yyyy HH:mm' } },
        },
      ],
    },
  ],
};
