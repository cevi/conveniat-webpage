import { environmentVariables } from '@/config/environment-variables';
import {
  isFullAdmin,
  shouldHideInAdminPanelIfNotAdmin,
} from '@/features/payload-cms/payload-cms/access-rules/roles';
import { AdminPanelDashboardGroups } from '@/features/payload-cms/payload-cms/admin-panel-dashboard-groups';
import { getValidationMessage } from '@/features/payload-cms/payload-cms/utils/validation-messages';
import { visitDayExportHandler } from '@/features/visit-day/api/visit-day-export-endpoint';
import type { ArrayFieldValidation, GlobalConfig, NumberFieldSingleValidation } from 'payload';

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

/** -1 closes the day to visitors without a Hof, so the Kontingent is a whole number from -1. */
const validateExternalCapacity: NumberFieldSingleValidation = (value, { req }) => {
  if (value === null || value === undefined || (Number.isInteger(value) && value >= -1)) {
    return true;
  }
  return getValidationMessage(req.i18n.language, {
    en: 'Enter a whole number from -1, or leave the field empty.',
    de: 'Gib eine ganze Zahl ab -1 ein oder lass das Feld leer.',
    fr: 'Saisis un nombre entier à partir de -1 ou laisse le champ vide.',
  });
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
      en: 'The days relatives may visit, the places per day and the Höfe the registration offers. The registration form picks the day from the Quartier of the Hof chosen; visitors without a Hof pick it themselves.',
      de: 'Die Tage, an denen Angehörige zu Besuch kommen dürfen, die Plätze pro Tag und die Höfe, welche die Anmeldung anbietet. Das Anmeldeformular wählt den Tag über das Quartier des gewählten Hofs; Besuchende ohne Bezug zu einem Hof wählen ihn selbst.',
      fr: 'Les jours où les proches peuvent venir en visite, les places par jour et les Hofs proposés à l’inscription. Le formulaire choisit le jour d’après le quartier du Hof sélectionné ; les visiteurs sans lien avec un Hof le choisissent eux-mêmes.',
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
                width: '34%',
                date: { pickerAppearance: 'dayOnly', displayFormat: 'dd.MM.yyyy' },
              },
            },
            {
              name: 'capacity',
              type: 'number',
              required: true,
              min: 0,
              label: {
                en: 'Places with lunch',
                de: 'Plätze mit Mittagessen',
                fr: 'Places avec repas de midi',
              },
              admin: {
                width: '33%',
                description: {
                  en: 'Every person registered takes one place, children included.',
                  de: 'Jede angemeldete Person belegt einen Platz, Kinder eingeschlossen.',
                  fr: 'Chaque personne inscrite occupe une place, enfants compris.',
                },
              },
            },
            {
              name: 'capacityWithoutLunch',
              type: 'number',
              min: 0,
              defaultValue: 0,
              label: {
                en: 'Places without lunch',
                de: 'Plätze ohne Mittagessen',
                fr: 'Places sans repas de midi',
              },
              admin: {
                width: '33%',
                description: {
                  en: 'For those who bring their own lunch. Counted apart from the places with lunch.',
                  de: 'Für alle, die sich selbst verpflegen. Wird getrennt von den Plätzen mit Mittagessen gezählt.',
                  fr: 'Pour celles et ceux qui apportent leur repas. Comptées à part des places avec repas.',
                },
              },
            },
          ],
        },
        {
          name: 'externalCapacity',
          type: 'number',
          min: -1,
          validate: validateExternalCapacity,
          label: {
            en: 'Places for visitors without a local group',
            de: 'Kontingent ohne Bezug zu einer Abteilung',
            fr: 'Contingent sans lien avec un groupe local',
          },
          admin: {
            description: {
              en: 'How many persons without a connection to a local group may register for this day. They still take places with or without lunch. Empty: no limit of their own. 0: closed, the choice shows greyed out. -1: none on this day, and with -1 on every day the question "Who are you visiting?" disappears.',
              de: 'Wie viele Personen ohne Bezug zu einer Abteilung sich für diesen Tag anmelden dürfen. Sie belegen weiterhin Plätze mit oder ohne Mittagessen. Leer: keine eigene Grenze. 0: geschlossen, die Wahl erscheint ausgegraut. -1: an diesem Tag keine; mit -1 an allen Tagen entfällt die Frage «Wen besucht ihr?».',
              fr: 'Combien de personnes sans lien avec un groupe local peuvent s’inscrire pour ce jour. Elles occupent toujours des places avec ou sans repas. Vide : pas de limite propre. 0 : fermé, le choix apparaît grisé. -1 : aucune ce jour-là ; avec -1 tous les jours, la question « Qui venez-vous voir ? » disparaît.',
            },
          },
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
