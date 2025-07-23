import { environmentVariables } from '@/config/environment-variables';
import { buildSecureConfig } from '@/features/payload-cms/payload-cms/access-rules/build-secure-config';
import { collectionsConfig } from '@/features/payload-cms/payload-cms/collections';
import { UserCollection } from '@/features/payload-cms/payload-cms/collections/user-collection';
import { emailSettings } from '@/features/payload-cms/payload-cms/email-settings';
import { dropRouteInfo } from '@/features/payload-cms/payload-cms/global-routes';
import { globalConfig } from '@/features/payload-cms/payload-cms/globals';
import { onPayloadInit } from '@/features/payload-cms/payload-cms/initialization';
import { LOCALE, locales } from '@/features/payload-cms/payload-cms/locales';
import { formPluginConfiguration } from '@/features/payload-cms/payload-cms/plugins/form/form-plugin-configuration';
import { index } from '@/features/payload-cms/payload-cms/plugins/lexical-editor';
import { redirectsPluginConfiguration } from '@/features/payload-cms/payload-cms/plugins/redirects/redirects-plugin-configuration';
import { s3StorageConfiguration } from '@/features/payload-cms/payload-cms/plugins/s3-storage-plugin-configuration';
import { searchPluginConfiguration } from '@/features/payload-cms/payload-cms/plugins/search/search-plugin-configuration';
import { smartphoneBreakpoints } from '@/features/payload-cms/utils/smartphone-breakpoints';
import type { Locale as LocaleType, RoutableConfig, StaticTranslationString } from '@/types/types';
import { mongooseAdapter } from '@payloadcms/db-mongodb';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { CollectionConfig, Locale } from 'payload';

import { de } from 'payload/i18n/de';
import { en } from 'payload/i18n/en';
import { fr } from 'payload/i18n/fr';
import sharp from 'sharp';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

/**
 * Generates the preview URL for the live preview feature.
 *
 * @param data
 * @param collectionConfig
 * @param locale
 */
// eslint-disable-next-line complexity
const generatePreviewUrl = ({
  data,
  collectionConfig,
  locale,
}: {
  data: { seo?: { urlSlug?: string }; id?: string } | null | undefined;
  collectionConfig?: CollectionConfig;
  locale: Locale;
}): string => {
  if (data === undefined || data === null) return '';

  if (collectionConfig) {
    if (collectionConfig.slug === 'timeline' && data.id !== undefined) {
      return `${environmentVariables.APP_HOST_URL}/${locale.code}/timeline-preview/${data.id}?preview=true`;
    }

    if (collectionConfig.slug === 'forms' && data.id !== undefined) {
      const urlSlugs: StaticTranslationString = {
        en: 'form-preview',
        de: 'formular-vorschau',
        fr: 'apercu-du-formulaire',
      };

      return `${environmentVariables.APP_HOST_URL}/${locale.code}/${urlSlugs[locale.code as LocaleType]}/${data.id}?preview=true`;
    }
  }

  if (!data.seo) return '';
  const urlSlug: string | undefined = data.seo.urlSlug;
  if (urlSlug == undefined) return '';

  return `${environmentVariables.APP_HOST_URL}/${locale.code}/${
    collectionConfig && collectionConfig.slug === 'blog' ? `blog/` : ''
  }${urlSlug}?preview=true`;
};

export const payloadConfig: RoutableConfig = {
  onInit: onPayloadInit,
  admin: {
    avatar: 'default',
    meta: {
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
    },
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

    livePreview: {
      url: generatePreviewUrl,
      breakpoints: smartphoneBreakpoints,
      collections: ['blog', 'generic-page', 'timeline', 'forms'],
    },
  },
  collections: collectionsConfig,
  editor: index,
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
  secret: environmentVariables.PAYLOAD_SECRET,
  // helps prevent CSRF attacks
  // (see https://payloadcms.com/docs/authentication/cookies#csrf-prevention)
  csrf: [environmentVariables.APP_HOST_URL],
  typescript: {
    autoGenerate: true,
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: mongooseAdapter({
    url: environmentVariables.DATABASE_URI,
  }),
  sharp: sharp,
  telemetry: false,
  plugins: [
    formPluginConfiguration,
    s3StorageConfiguration,
    searchPluginConfiguration,
    redirectsPluginConfiguration,
  ],
  i18n: {
    fallbackLanguage: LOCALE.DE,
    supportedLanguages: { en, de, fr },
  },
  ...emailSettings,
};

// export the config for PayloadCMS
export default buildSecureConfig(dropRouteInfo(payloadConfig));
