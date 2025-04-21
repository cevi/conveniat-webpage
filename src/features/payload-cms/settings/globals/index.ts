import type { GlobalConfig } from 'payload';
import { HeaderGlobal } from '@/features/payload-cms/settings/globals/header-global';
import { FooterGlobal } from '@/features/payload-cms/settings/globals/footer-global';
import { SeoGlobal } from '@/features/payload-cms/settings/globals/seo-global';
import { PWAGlobal } from '@/features/payload-cms/settings/globals/pwa-global';

export const globalConfig: GlobalConfig[] = [HeaderGlobal, FooterGlobal, SeoGlobal, PWAGlobal];
