import { AlertSettingsGlobal } from '@/features/payload-cms/payload-cms/globals/alert-settings-global';
import { FooterGlobal } from '@/features/payload-cms/payload-cms/globals/footer-global';
import { HeaderGlobal } from '@/features/payload-cms/payload-cms/globals/header-global';
import { PWAGlobal } from '@/features/payload-cms/payload-cms/globals/pwa-global';
import { SeoGlobal } from '@/features/payload-cms/payload-cms/globals/seo-global';
import type { GlobalConfig } from 'payload';

export const globalConfig: GlobalConfig[] = [
  HeaderGlobal,
  FooterGlobal,
  SeoGlobal,
  PWAGlobal,
  AlertSettingsGlobal,
];
