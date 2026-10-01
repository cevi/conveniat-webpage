import { environmentVariables } from '@/config/environment-variables';
import { areaOptions } from '@/features/hof-dashboard/payload-cms/options';
import { canReviewHofDashboard } from '@/features/payload-cms/payload-cms/access-rules/can-access-hof-dashboard';
import { AdminPanelDashboardGroups } from '@/features/payload-cms/payload-cms/admin-panel-dashboard-groups';
import { LOCALE } from '@/features/payload-cms/payload-cms/locales';
import { getValidationMessage } from '@/features/payload-cms/payload-cms/utils/validation-messages';
import type { StaticTranslationString } from '@/types/types';
import type { ArrayField, GlobalConfig, PayloadRequest, TextFieldSingleValidation } from 'payload';

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
      ],
    },
  ],
};
