import {
  DEFAULT_HOF_DASHBOARD_AREAS,
  HOF_AREA_ICONS,
  type HofAreaIcon,
  type HofDashboardAreaInfo,
} from '@/features/hof-dashboard/constants';
import { LOCALE } from '@/features/payload-cms/payload-cms/locales';
import type { Locale, StaticTranslationString } from '@/types/types';
import type { Payload } from 'payload';

const LOCALES: readonly Locale[] = [LOCALE.DE, LOCALE.FR, LOCALE.EN];

const textOf = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() !== '' ? value : undefined;

const isIcon = (value: unknown): value is HofAreaIcon =>
  typeof value === 'string' && (HOF_AREA_ICONS as readonly string[]).includes(value);

/**
 * The tab's name in every language. A language without its own falls back to German, except
 * that a default tab whose German name is still the one it came with keeps its translations:
 * the first save of the settings stores only the language it was made in.
 */
const labelOf = (stored: unknown, id: string): StaticTranslationString => {
  // read with every locale, a localized field is an object; read in one, a string
  const byLocale: Partial<Record<Locale, unknown>> =
    typeof stored === 'object' && stored !== null ? stored : { [LOCALE.DE]: stored };
  const builtIn = DEFAULT_HOF_DASHBOARD_AREAS.find((area) => area.id === id)?.label;
  const german = textOf(byLocale[LOCALE.DE]);
  // a tab of the editors' own has no translations to keep
  const keepsTranslations = german === undefined || german === builtIn?.de;
  return Object.fromEntries(
    LOCALES.map((locale) => [
      locale,
      textOf(byLocale[locale]) ??
        (keepsTranslations ? builtIn?.[locale] : undefined) ??
        german ??
        builtIn?.de ??
        id,
    ]),
  ) as StaticTranslationString;
};

/**
 * The dashboard's tabs in the editors' order, from the rows of the dashboard settings. Settings
 * never saved with tabs have the ones the dashboard always had.
 */
export const resolveHofDashboardAreas = (rows: unknown): HofDashboardAreaInfo[] => {
  if (!Array.isArray(rows)) return [...DEFAULT_HOF_DASHBOARD_AREAS];
  return rows.flatMap((row: unknown): HofDashboardAreaInfo[] => {
    if (typeof row !== 'object' || row === null) return [];
    const { id, label, icon } = row as { id?: unknown; label?: unknown; icon?: unknown };
    if (typeof id !== 'string' || id === '') return [];
    return [{ id, label: labelOf(label, id), icon: isIcon(icon) ? icon : 'clipboard-list' }];
  });
};

/** The dashboard's tabs as the editors set them up, with their names in every language. */
export const getHofDashboardAreas = async (payload: Payload): Promise<HofDashboardAreaInfo[]> => {
  const settings = await payload.findGlobal({
    slug: 'hof-dashboard-settings',
    locale: 'all',
    depth: 0,
    overrideAccess: true,
    select: { areas: true },
  });
  return resolveHofDashboardAreas((settings as { areas?: unknown }).areas);
};
