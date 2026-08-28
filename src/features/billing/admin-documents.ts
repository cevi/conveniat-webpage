import type { StaticTranslationString } from '@/types/types';

/**
 * The admin documents a billing run depends on being configured.
 *
 * A run that stops because a setting is missing should hand the operator the page that
 * fixes it, rather than naming it in prose and leaving them to find it. Services record
 * the key; the admin UI turns it into a link.
 */
export const BILLING_ADMIN_DOCUMENTS = {
  registrationManagement: {
    href: '/admin/globals/registration-management',
    label: {
      de: 'Anmeldungs-Verwaltung öffnen',
      en: 'Open Registration Management',
      fr: 'Ouvrir la gestion des inscriptions',
    } satisfies StaticTranslationString,
  },
  billSettings: {
    href: '/admin/globals/bill-settings',
    label: {
      de: 'Rechnungs-Einstellungen öffnen',
      en: 'Open Bill Settings',
      fr: 'Ouvrir les paramètres de facturation',
    } satisfies StaticTranslationString,
  },
} as const;

export type BillingAdminDocumentKey = keyof typeof BILLING_ADMIN_DOCUMENTS;

/** Ignores keys a newer service emitted that this client does not know about. */
export const readAdminDocumentKeys = (
  summary: Record<string, unknown> | undefined,
): BillingAdminDocumentKey[] => {
  const keys = summary?.['relatedDocuments'];
  if (!Array.isArray(keys)) return [];
  return keys.filter((key): key is BillingAdminDocumentKey =>
    Object.hasOwn(BILLING_ADMIN_DOCUMENTS, String(key)),
  );
};
