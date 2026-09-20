import { hasAdminOrWebAccess } from '@/features/payload-cms/payload-cms/access-rules/roles';
import { AdminPanelDashboardGroups } from '@/features/payload-cms/payload-cms/admin-panel-dashboard-groups';
import { flushPageCacheOnChangeGlobal } from '@/features/payload-cms/payload-cms/utils/flush-page-cache-on-change';
import type { GlobalConfig } from 'payload';

/**
 * The campaign figures behind every Spendenbarometer block on the site.
 *
 * The numbers live here rather than on the block so that the figure an editor
 * types is the figure every page shows, and so that the automatic update we
 * want later writes to exactly one field instead of hunting through page
 * content.
 *
 * Deliberately not an `asLocalizedGlobal`: the amounts are the same number in
 * every language, and requiring a separate publish per locale would mean a
 * donation total that is current in German and stale in French.
 */
export const DonationBarometerGlobal: GlobalConfig = {
  slug: 'donation-barometer',
  access: {
    read: () => true,
    update: hasAdminOrWebAccess,
  },
  label: {
    en: 'Donation Barometer',
    de: 'Spendenbarometer',
    fr: 'Baromètre des dons',
  },
  admin: {
    group: AdminPanelDashboardGroups.WebpageContent.label,
    description: {
      en: 'The goal and the amount raised so far, shared by every Spendenbarometer block on the site.',
      de: 'Das Ziel und der bisher gesammelte Betrag, gemeinsam genutzt von jedem Spendenbarometer-Block der Website.',
      fr: "L'objectif et le montant déjà récolté, partagés par chaque bloc Baromètre des dons du site.",
    },
  },
  hooks: {
    afterChange: [flushPageCacheOnChangeGlobal],
  },
  fields: [
    {
      name: 'goalAmount',
      type: 'number',
      required: true,
      min: 1,
      label: {
        en: 'Goal (CHF)',
        de: 'Ziel (CHF)',
        fr: 'Objectif (CHF)',
      },
      admin: {
        description: {
          en: 'The full amount the campaign is asking for. Changing it moves every barometer on the site.',
          de: 'Der Gesamtbetrag, den die Kampagne sammeln will. Eine Änderung verschiebt jedes Barometer der Website.',
          fr: 'Le montant total visé par la campagne. Le modifier déplace tous les baromètres du site.',
        },
      },
    },
    {
      name: 'raisedAmount',
      type: 'number',
      required: true,
      defaultValue: 0,
      min: 0,
      label: {
        en: 'Raised so far (CHF)',
        de: 'Bisher gesammelt (CHF)',
        fr: 'Déjà récolté (CHF)',
      },
      admin: {
        description: {
          en: 'Maintained by hand for now. Round it — a barometer reading 162,400 invites less doubt than one reading 162,437.55.',
          de: 'Vorläufig von Hand gepflegt. Runde den Betrag — 162’400 weckt weniger Zweifel als 162’437.55.',
          fr: "Saisi à la main pour l'instant. Arrondis le montant : 162 400 suscite moins de doutes que 162 437.55.",
        },
      },
    },
    {
      name: 'lastUpdated',
      type: 'date',
      label: {
        en: 'Figures as of',
        de: 'Stand vom',
        fr: 'Chiffres au',
      },
      admin: {
        date: {
          pickerAppearance: 'dayOnly',
          displayFormat: 'dd.MM.yyyy',
        },
        description: {
          en: 'Shown under the barometer. A donation total without a date reads as guesswork.',
          de: 'Wird unter dem Barometer angezeigt. Ein Spendenstand ohne Datum wirkt geschätzt.',
          fr: 'Affiché sous le baromètre. Un total sans date passe pour une estimation.',
        },
      },
    },
    {
      name: 'milestones',
      type: 'array',
      maxRows: 6,
      label: {
        en: 'Milestones',
        de: 'Meilensteine',
        fr: 'Jalons',
      },
      labels: {
        singular: { en: 'Milestone', de: 'Meilenstein', fr: 'Jalon' },
        plural: { en: 'Milestones', de: 'Meilensteine', fr: 'Jalons' },
      },
      admin: {
        description: {
          en: 'Optional stops along the way. The next one that is not yet funded is named under the barometer, so give each a label that says what the money buys.',
          de: 'Optionale Zwischenziele. Der nächste noch nicht erreichte Meilenstein wird unter dem Barometer genannt — beschrifte ihn also damit, was das Geld ermöglicht.',
          fr: "Étapes intermédiaires facultatives. Le prochain jalon non atteint est nommé sous le baromètre : décris donc ce que l'argent permet.",
        },
      },
      fields: [
        {
          name: 'amount',
          type: 'number',
          required: true,
          min: 1,
          label: {
            en: 'Reached at (CHF)',
            de: 'Erreicht bei (CHF)',
            fr: 'Atteint à (CHF)',
          },
        },
        {
          name: 'label',
          type: 'text',
          required: true,
          localized: true,
          label: {
            en: 'What this pays for',
            de: 'Was damit möglich wird',
            fr: 'Ce que cela permet',
          },
        },
      ],
    },
  ],
};
