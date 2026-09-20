import type { StaticTranslationString } from '@/types/types';

/**
 * The three target areas the admin panel is organised by. Every sidebar group belongs to
 * exactly one area, and the dashboard renders one column per area.
 */
export type AdminPanelArea = 'webpage' | 'app' | 'backoffice';

export const AdminPanelAreas: Record<AdminPanelArea, StaticTranslationString> = {
  webpage: { de: 'Webseite', en: 'Website', fr: 'Site web' },
  app: { de: 'App', en: 'App', fr: 'App' },
  backoffice: { de: 'Backoffice', en: 'Back office', fr: 'Backoffice' },
};

export interface AdminPanelDashboardGroup {
  area: AdminPanelArea;
  /** The group name without the area prefix, used on the dashboard. */
  name: StaticTranslationString;
  /** The sidebar label, `<area> · <name>`. Pass this to `admin.group`. */
  label: StaticTranslationString;
}

const defineGroup = (
  area: AdminPanelArea,
  name: StaticTranslationString,
): AdminPanelDashboardGroup => ({
  area,
  name,
  label: {
    de: `${AdminPanelAreas[area].de} · ${name.de}`,
    en: `${AdminPanelAreas[area].en} · ${name.en}`,
    fr: `${AdminPanelAreas[area].fr} · ${name.fr}`,
  },
});

/**
 * Sidebar groups of the admin panel.
 *
 * Payload has no group ordering option (payloadcms/payload#14528, cevi/conveniat-webpage#920).
 * It lists groups in the order it first meets them, walking all collections in config order
 * and only then all globals. Two rules therefore fix the sidebar order:
 *
 * 1. `collections/index.ts` is ordered by area, and that order is the sidebar order.
 * 2. Every group contains at least one collection. A group that only holds globals would
 *    always land at the very bottom, after every collection group.
 */
export const AdminPanelDashboardGroups = {
  WebpageContent: defineGroup('webpage', { de: 'Inhalte', en: 'Content', fr: 'Contenu' }),
  WebpageMedia: defineGroup('webpage', { de: 'Medien', en: 'Media', fr: 'Médias' }),
  WebpageHelpers: defineGroup('webpage', {
    de: 'Helferanmeldung',
    en: 'Helper Registration',
    fr: 'Inscription des helpers',
  }),
  AppContent: defineGroup('app', { de: 'Inhalte', en: 'Content', fr: 'Contenu' }),
  AppCampsite: defineGroup('app', {
    de: 'Lagerplatz & Programm',
    en: 'Campsite & Programme',
    fr: 'Terrain de camp et programme',
  }),
  AppOperations: defineGroup('app', { de: 'Betrieb', en: 'Operations', fr: 'Exploitation' }),
  BackofficePeople: defineGroup('backoffice', {
    de: 'Personen & Zugriff',
    en: 'People & Access',
    fr: 'Personnes et accès',
  }),
  BackofficeBilling: defineGroup('backoffice', {
    de: 'Rechnungen',
    en: 'Billing',
    fr: 'Facturation',
  }),
  BackofficeSystem: defineGroup('backoffice', { de: 'System', en: 'System', fr: 'Système' }),
} satisfies Record<string, AdminPanelDashboardGroup>;

export type AdminPanelDashboardGroupKey = keyof typeof AdminPanelDashboardGroups;
