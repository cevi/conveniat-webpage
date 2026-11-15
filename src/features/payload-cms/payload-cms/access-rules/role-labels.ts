import { Roles } from '@/features/payload-cms/payload-cms/access-rules/roles';
import type { StaticTranslationString } from '@/types/types';

/** How the admin panel names each role, wherever an editor reads or picks one. */
export const ROLE_LABELS: Record<Roles, StaticTranslationString> = {
  [Roles.FullAdmin]: { de: 'Admin', en: 'Admin', fr: 'Admin' },
  [Roles.WebCoreTeam]: { de: 'Web-Kernteam', en: 'Web core team', fr: 'Équipe web' },
  [Roles.TranslationTeam]: {
    de: 'Übersetzungsteam',
    en: 'Translation team',
    fr: 'Équipe de traduction',
  },
  [Roles.ProgramTeam]: { de: 'Programmteam', en: 'Programme team', fr: 'Équipe programme' },
  [Roles.BillingTeam]: { de: 'Rechnungswesen', en: 'Billing', fr: 'Facturation' },
  [Roles.MaterialTeam]: { de: 'Materialteam', en: 'Material team', fr: 'Équipe matériel' },
  [Roles.HofDashboardReviewer]: {
    de: 'Hof-Dashboard-Prüfung',
    en: 'Hof dashboard reviewers',
    fr: 'Vérification du tableau de bord des Hofs',
  },
  [Roles.SafetyTeam]: {
    de: 'Sicherheit & Sanität',
    en: 'Security & first aid',
    fr: 'Sécurité & premiers secours',
  },
  [Roles.ForumZentrale]: { de: 'Forum-Zentrale', en: 'Forum Zentrale', fr: 'Zentrale du forum' },
  [Roles.HelperPool]: { de: 'Helferpool', en: 'Helper pool', fr: 'Pool de helpers' },
};
