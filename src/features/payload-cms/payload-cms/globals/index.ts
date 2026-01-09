import { AlertManagement } from '@/features/payload-cms/payload-cms/globals/alert-management';
import { AlertSettingsGlobal } from '@/features/payload-cms/payload-cms/globals/alert-settings-global';
import { AllChatsManagement } from '@/features/payload-cms/payload-cms/globals/all-chats-management';
import { AppFeatureFlags } from '@/features/payload-cms/payload-cms/globals/app-feature-flags';
import { FooterGlobal } from '@/features/payload-cms/payload-cms/globals/footer-global';
import { HeaderGlobal } from '@/features/payload-cms/payload-cms/globals/header-global';
import { PWAGlobal } from '@/features/payload-cms/payload-cms/globals/pwa-global';
import { SeoGlobal } from '@/features/payload-cms/payload-cms/globals/seo-global';
import { SupportChatManagement } from '@/features/payload-cms/payload-cms/globals/support-chat-management';
import type { GlobalConfig } from 'payload';

export const globalConfig: GlobalConfig[] = [
  HeaderGlobal,
  FooterGlobal,
  SeoGlobal,
  PWAGlobal,
  AlertSettingsGlobal,
  AppFeatureFlags,
  SupportChatManagement,
  AlertManagement,
  AllChatsManagement,
];
