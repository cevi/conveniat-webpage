import { environmentVariables as env } from '@/config/environment-variables';
import { buildSecureConfig } from '@/features/payload-cms/payload-cms/access-rules/build-secure-config';
import { collectionsConfig } from '@/features/payload-cms/payload-cms/collections';
import { UserCollection } from '@/features/payload-cms/payload-cms/collections/user-collection';
import { emailSettings } from '@/features/payload-cms/payload-cms/email-settings';
import { dropRouteInfo } from '@/features/payload-cms/payload-cms/global-routes';
import { globalConfig } from '@/features/payload-cms/payload-cms/globals';
import { onPayloadInit } from '@/features/payload-cms/payload-cms/initialization';
import { LOCALE, locales } from '@/features/payload-cms/payload-cms/locales';
import { formPluginConfiguration } from '@/features/payload-cms/payload-cms/plugins/form/form-plugin-configuration';
import { lexicalEditor } from '@/features/payload-cms/payload-cms/plugins/lexical-editor';
import { redirectsPluginConfiguration } from '@/features/payload-cms/payload-cms/plugins/redirects/redirects-plugin-configuration';
import { s3StorageConfiguration } from '@/features/payload-cms/payload-cms/plugins/s3-storage-plugin-configuration';
import { searchPluginConfiguration } from '@/features/payload-cms/payload-cms/plugins/search/search-plugin-configuration';
import { fetchSmtpBouncesTask } from '@/features/payload-cms/payload-cms/tasks/fetch-smtp-bounces';
import { smartphoneBreakpoints } from '@/features/payload-cms/utils/smartphone-breakpoints';
import { registrationWorkflow } from '@/features/registration_process/workflows/registration-workflow';
import { blockJobStep } from '@/features/registration_process/workflows/steps/block-job';
import { cleanupTemporaryRolesStep } from '@/features/registration_process/workflows/steps/cleanup-temporary-roles';
import { confirmationMessageStep } from '@/features/registration_process/workflows/steps/confirmation-message';
import { createUserStep } from '@/features/registration_process/workflows/steps/create-user';
import { ensureEventMembershipStep } from '@/features/registration_process/workflows/steps/ensure-event-membership';
import { ensureGroupMembershipStep } from '@/features/registration_process/workflows/steps/ensure-group-membership';
import { resolveUserStep } from '@/features/registration_process/workflows/steps/resolve-user';
import type { RoutableConfig } from '@/types/types';
import { redirectsTranslations } from '@payloadcms/plugin-redirects';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  enabledWidgets,
  widgetDefaultLayout,
} from '@/features/payload-cms/payload-cms/widgets/widget-configuration';
import { generatePreviewUrl } from '@/features/payload-cms/utils/preview/generate-preview-url';
import { dbConfig } from '@/lib/db/mongodb';
import type { JobsConfig, MetaConfig } from 'payload';
import { de } from 'payload/i18n/de';
import { en } from 'payload/i18n/en';
import { fr } from 'payload/i18n/fr';
import sharp from 'sharp';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

const defaultMetaConfig: MetaConfig = {
  title: 'Admin Panel',
  description: 'conveniat27 - Admin Panel',
  icons: [
    {
      rel: 'icon',
      type: 'image/svg+xml',
      url: '/favicon.svg',
    },
  ],
  titleSuffix: ' | conveniat27',
  openGraph: {
    title: 'conveniat27 - Admin Panel',
    description: 'conveniat27 - Admin Panel',
    images: [
      {
        url: '/favicon.svg',
        width: 75,
        height: 75,
      },
    ],
  },
};

const payloadConfigAdminSettings: RoutableConfig['admin'] = {
  suppressHydrationWarning: true,
  avatar: 'default',
  meta: defaultMetaConfig,
  components: {
    graphics: {
      Icon: '@/components/svg-logos/conveniat-logo.tsx#ConveniatLogo',
      Logo: '@/components/svg-logos/conveniat-logo.tsx#ConveniatLogo',
    },
    beforeDashboard: [
      {
        path: '@/features/payload-cms/payload-cms/components/dashboard-welcome-banner',
      },
    ],
    afterLogin: [
      {
        path: '@/features/payload-cms/payload-cms/components/login-page/admin-panel-login-page',
      },
    ],
  },
  user: UserCollection.slug,
  importMap: {
    baseDir: path.resolve(dirname),
  },
  dateFormat: 'yyyy-MM-dd HH:mm',
  timezones: {
    supportedTimezones: [{ label: 'Europe/Zurich', value: 'Europe/Zurich' }],
    defaultTimezone: 'Europe/Zurich',
  },
  livePreview: {
    url: generatePreviewUrl,
    breakpoints: smartphoneBreakpoints,
    collections: ['blog', 'generic-page', 'timeline', 'forms', 'camp-map-annotations'],
  },
  dashboard: {
    widgets: enabledWidgets,
    defaultLayout: widgetDefaultLayout,
  },
};

const jobsConfig: JobsConfig = {
  deleteJobOnComplete: false,
  jobsCollectionOverrides: ({ defaultJobsCollection }) => ({
    ...defaultJobsCollection,
    admin: {
      ...defaultJobsCollection.admin,
      hidden: false,
    },
  }),
  tasks: [
    resolveUserStep,
    createUserStep,
    blockJobStep,
    cleanupTemporaryRolesStep,
    ensureGroupMembershipStep,
    ensureEventMembershipStep,
    confirmationMessageStep,
    fetchSmtpBouncesTask,
  ],
  workflows: [registrationWorkflow],
  autoRun: [
    {
      cron: '*/10 * * * * *', // Every 10 seconds
      limit: 10,
      queue: 'default',
    },
  ],
};

export const payloadConfig: RoutableConfig = {
  onInit: onPayloadInit,
  admin: payloadConfigAdminSettings,
  collections: collectionsConfig,
  editor: lexicalEditor,
  globals: globalConfig,
  localization: {
    locales,
    defaultLocale: LOCALE.DE,
    fallback: false,
  },
  graphQL: {
    disable: true, // we don't need GraphQL for this project
    disablePlaygroundInProduction: true,
  },
  secret: env.PAYLOAD_SECRET,
  // helps prevent CSRF attacks
  // (see https://payloadcms.com/docs/authentication/cookies#csrf-prevention)
  csrf: [env.APP_HOST_URL],
  typescript: {
    autoGenerate: true,
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: dbConfig,
  sharp: sharp,
  telemetry: false,
  plugins: [
    formPluginConfiguration,
    s3StorageConfiguration,
    searchPluginConfiguration,
    redirectsPluginConfiguration,
  ],
  jobs: jobsConfig,
  i18n: {
    fallbackLanguage: LOCALE.DE,
    supportedLanguages: {
      // patch that the redirect plugin has no german translations
      en: { ...en, ...redirectsTranslations.en },
      de: { ...de, ...redirectsTranslations.en },
      fr: { ...fr, ...redirectsTranslations.fr },
    },
  },
  ...emailSettings,
};

// export the config for PayloadCMS
export default buildSecureConfig(dropRouteInfo(payloadConfig));
