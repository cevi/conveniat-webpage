import type { GlobalConfig } from 'payload';
import { HeaderGlobal } from '@/features/payload-cms/payload-cms/globals/header-global';
import { FooterGlobal } from '@/features/payload-cms/payload-cms/globals/footer-global';
import { SeoGlobal } from '@/features/payload-cms/payload-cms/globals/seo-global';
import { PWAGlobal } from '@/features/payload-cms/payload-cms/globals/pwa-global';

export const globalConfig: GlobalConfig[] = [HeaderGlobal, FooterGlobal, SeoGlobal, PWAGlobal];
