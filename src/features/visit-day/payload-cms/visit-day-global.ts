import { environmentVariables } from '@/config/environment-variables';
import {
  isFullAdmin,
  shouldHideInAdminPanelIfNotAdmin,
} from '@/features/payload-cms/payload-cms/access-rules/roles';
import { AdminPanelDashboardGroups } from '@/features/payload-cms/payload-cms/admin-panel-dashboard-groups';
import { getValidationMessage } from '@/features/payload-cms/payload-cms/utils/validation-messages';
import { visitDayExportHandler } from '@/features/visit-day/api/visit-day-export-endpoint';
import type { ArrayFieldValidation, GlobalConfig } from 'payload';

interface DayRow {
  date?: unknown;
  quartiere?: unknown;
}

const idOf = (value: unknown): string | undefined => {
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value !== null && 'id' in value) {
    return typeof value.id === 'string' ? value.id : undefined;
  }
  return undefined;
};

/**
 * A Hof finds its day through its Quartier, so a Quartier may visit on one day only, and a day
 * is listed once: otherwise a Hof would have two days and the places of one day two counters.
 */
const validateDays: ArrayFieldValidation = (value, { req }) => {
  const rows = Array.isArray(value) ? (value as DayRow[]) : [];
  const dates = rows
    .map((row) => (typeof row.date === 'string' ? row.date.slice(0, 10) : ''))
    .filter((date) => date !== '');
  if (new Set(dates).size !== dates.length) {
    return getValidationMessage(req.i18n.language, {
      en: 'Every day may be listed only once.',
      de: 'Jeder Tag darf nur einmal vorkommen.',
      fr: 'Chaque jour ne peut figurer qu’une seule fois.',
    });
  }
  const quartiere = rows.flatMap((row) =>
    Array.isArray(row.quartiere) ? row.quartiere.map((q) => idOf(q)) : [],
  );
  if (new Set(quartiere).size !== quartiere.length) {
    return getValidationMessage(req.i18n.language, {
      en: 'A Quartier may visit on one day only.',
      de: 'Ein Quartier darf nur an einem Tag besucht werden.',
      fr: 'Un quartier ne peut être visité qu’un seul jour.',
    });
  }
  return true;
};

/**
 * The Besuchstag: on which day the relatives of each Quartier may visit, how many places a day
 * has, and which Höfe the registration does not offer. The registration form reads it through
 * its Besuchstag field; the people registered live in Postgres, one row per visitor.
 *
 * Only full admins open it: its export lists every visitor with their allergies.
 */
export const VisitDayGlobal: GlobalConfig = {
  slug: 'visit-day',
  typescript: { interface: 'VisitDaySetting' },
  label: { de: 'Besuchstag', en: 'Visiting day', fr: 'Journée des visites' },
  admin: {
    group: AdminPanelDashboardGroups.BackofficeHoefeAndMaterial.label,
    hidden: ({ user }): boolean =>
      !environmentVariables.FEATURE_ENABLE_VISIT_DAY || shouldHideInAdminPanelIfNotAdmin({ user }),
    description: {
      en: 'The days relatives may visit, the places per day and the Höfe the registration offers. The registration form picks the day from the Quartier of the Hof chosen.',
      de: 'Die Tage, an denen Angehörige zu Besuch kommen dürfen, die Plätze pro Tag und die Höfe, welche die Anmeldung anbietet. Das Anmeldeformular wählt den Tag über das Quartier des gewählten Hofs.',
      fr: 'Les jours où les proches peuvent venir en visite, les places par jour et les Hofs proposés à l’inscription. Le formulaire choisit le jour d’après le quartier du Hof sélectionné.',
    },
  },
  access: {
    read: isFullAdmin,
    update: isFullAdmin,
  },
  endpoints: [{ path: '/export-xlsx', method: 'get', handler: visitDayExportHandler }],
  fields: [
    {
      name: 'days',
      type: 'array',
      label: { en: 'Days', de: 'Tage', fr: 'Jours' },
      labels: {
        singular: { en: 'Day', de: 'Tag', fr: 'Jour' },
        plural: { en: 'Days', de: 'Tage', fr: 'Jours' },
      },
      validate: validateDays,
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'date',
              type: 'date',
              required: true,
              label: { en: 'Date', de: 'Datum', fr: 'Date' },
              admin: {
                width: '50%',
                date: { pickerAppearance: 'dayOnly', displayFormat: 'dd.MM.yyyy' },
              },
            },
            {
              name: 'capacity',
              type: 'number',
              required: true,
              min: 0,
              label: { en: 'Places', de: 'Plätze', fr: 'Places' },
              admin: {
                width: '50%',
                description: {
                  en: 'Every person registered takes one place, children included.',
                  de: 'Jede angemeldete Person belegt einen Platz, Kinder eingeschlossen.',
                  fr: 'Chaque personne inscrite occupe une place, enfants compris.',
                },
              },
            },
          ],
        },
        {
          name: 'quartiere',
          type: 'relationship',
          relationTo: 'quartiere',
          hasMany: true,
          required: true,
          label: { en: 'Quartiere', de: 'Quartiere', fr: 'Quartiers' },
          admin: {
            description: {
              en: 'The relatives of the Höfe in these Quartiere visit on this day.',
              de: 'Die Angehörigen der Höfe in diesen Quartieren kommen an diesem Tag.',
              fr: 'Les proches des Hofs de ces quartiers viennent ce jour-là.',
            },
          },
        },
      ],
    },
    {
      name: 'hiddenHoefe',
      type: 'relationship',
      relationTo: 'hoefe',
      hasMany: true,
      label: { en: 'Hidden Höfe', de: 'Ausgeblendete Höfe', fr: 'Hofs masqués' },
      admin: {
        description: {
          en: 'Not offered in the registration, e.g. a Hof for testing. A Hof without a Quartier is never offered.',
          de: 'Werden in der Anmeldung nicht angeboten, z.B. ein Hof zum Testen. Ein Hof ohne Quartier wird nie angeboten.',
          fr: 'Ne sont pas proposés à l’inscription, p. ex. un Hof de test. Un Hof sans quartier n’est jamais proposé.',
        },
      },
    },
    {
      name: 'visitorExport',
      type: 'ui',
      admin: {
        components: {
          Field: '@/features/visit-day/components/visit-day-export-button#VisitDayExportButton',
        },
      },
    },
  ],
};
