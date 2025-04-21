import type { GlobalConfig } from 'payload';
import { HeaderGlobal } from '@/payload-cms/globals/header-global';
import { FooterGlobal } from '@/payload-cms/globals/footer-global';
import { SeoGlobal } from '@/payload-cms/globals/seo-global';
import { PWAGlobal } from '@/payload-cms/globals/pwa-global';

export const globalConfig: GlobalConfig[] = [HeaderGlobal, FooterGlobal, SeoGlobal, PWAGlobal];
