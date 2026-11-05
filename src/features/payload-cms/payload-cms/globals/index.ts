import { BillSettingsGlobal } from '@/features/billing/collections/bill-settings';
import { HofDashboardSettingsGlobal } from '@/features/hof-dashboard/payload-cms/hof-dashboard-settings-global';
import { AlertManagement } from '@/features/payload-cms/payload-cms/globals/alert-management';
import { AlertSettingsGlobal } from '@/features/payload-cms/payload-cms/globals/alert-settings-global';
import { AllChatsManagement } from '@/features/payload-cms/payload-cms/globals/all-chats-management';
import { AppFeatureFlags } from '@/features/payload-cms/payload-cms/globals/app-feature-flags';
import { AppLandingPageGlobal } from '@/features/payload-cms/payload-cms/globals/app-landing-page-global';
import { CeviDatabaseSessionGlobal } from '@/features/payload-cms/payload-cms/globals/cevidb-session-global';
import { DonationBarometerGlobal } from '@/features/payload-cms/payload-cms/globals/donation-barometer-global';
import { EmailSignatureGlobal } from '@/features/payload-cms/payload-cms/globals/email-signature-global';
import { FooterGlobal } from '@/features/payload-cms/payload-cms/globals/footer-global';
import { HeaderGlobal } from '@/features/payload-cms/payload-cms/globals/header-global';
import { PWAGlobal } from '@/features/payload-cms/payload-cms/globals/pwa-global';
import { SeoGlobal } from '@/features/payload-cms/payload-cms/globals/seo-global';
import { CampsitePresenceGlobal } from '@/features/presence/payload-cms/globals/campsite-presence';
import { VisitDayBillSettingsGlobal } from '@/features/visit-day/billing/visit-day-bill-settings-global';
import { VisitDayGlobal } from '@/features/visit-day/payload-cms/visit-day-global';
import type { GlobalConfig } from 'payload';

/**
 * Globals always follow the collections of their group in the sidebar, so this order only
 * matters within a group. See `admin-panel-dashboard-groups.ts`.
 */
export const globalConfig: GlobalConfig[] = [
  // Webseite
  HeaderGlobal,
  FooterGlobal,
  SeoGlobal,
  DonationBarometerGlobal,

  // App
  AppLandingPageGlobal,
  AlertManagement,
  AlertSettingsGlobal,
  AllChatsManagement,
  CampsitePresenceGlobal,
  PWAGlobal,
  AppFeatureFlags,

  // Backoffice
  BillSettingsGlobal,
  VisitDayBillSettingsGlobal,
  HofDashboardSettingsGlobal,
  VisitDayGlobal,
  CeviDatabaseSessionGlobal,
  EmailSignatureGlobal,
];
