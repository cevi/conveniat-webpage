import { mongooseAdapter } from '@payloadcms/db-mongodb';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { UserCollection } from '@/payload-cms/collections/user-collection';
import { en } from 'payload/i18n/en';
import { de } from 'payload/i18n/de';
import { fr } from 'payload/i18n/fr';
import { LOCALE, locales } from '@/payload-cms/locales';
import { buildSecureConfig } from '@/payload-cms/access-rules/build-secure-config';
import { formBuilderPlugin } from '@payloadcms/plugin-form-builder';
import { onPayloadInit } from 'src/payload-cms/initialization';
import { dropRouteInfo } from '@/payload-cms/global-routes';
import { RoutableConfig } from '@/types';
import { emailSettings } from '@/payload-cms/email-settings';
import { collectionsConfig } from '@/payload-cms/collections';
import { lexicalEditor } from '@/payload-cms/plugins/lexical-editor';
import { s3StorageConfiguration } from '@/payload-cms/plugins/s3-storage-plugin-configuration';
import { searchPluginConfiguration } from '@/payload-cms/plugins/search/search-plugin-configuration';
import { globalConfig } from '@/payload-cms/globals';
import sharp from 'sharp';
import { CollectionConfig, Locale } from 'payload';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

const PAYLOAD_SECRET = process.env['PAYLOAD_SECRET'] ?? '';
const DATABASE_URI = process.env['DATABASE_URI'] ?? '';
const APP_HOST_URL = process.env['APP_HOST_URL'] ?? '';
//const APP_HOST_URL = process.env['APP_HOST_URL'] ?? ''; // not needed as live-preview is currently disabled

/**
 * Generates the preview URL for the live preview feature.
 *
 * @param data
 * @param collectionConfig
 * @param locale
 */
const generatePreviewUrl = ({
  data,
  collectionConfig,
  locale,
}: {
  data: { seo?: { urlSlug?: string } };
  collectionConfig?: CollectionConfig;
  locale: Locale;
}): string => {
  if (!data.seo) return '';
  const urlSlug: string | undefined = data.seo.urlSlug;
  if (urlSlug == undefined) return '';
  return `${APP_HOST_URL}/${locale.code}${
    collectionConfig && collectionConfig.slug === 'blog' ? `/blog/${urlSlug}` : ''
  }?preview=true`;
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
          path: '@/payload-cms/components/dashboard-welcome-banner',
        },
      ],
      afterLogin: [
        {
          path: '@/payload-cms/components/login-page/admin-panel-login-page',
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
      collections: ['blog', 'generic-page', 'timeline'],
    },
  },
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
  secret: PAYLOAD_SECRET,
  // helps prevent CSRF attacks
  // (see https://payloadcms.com/docs/authentication/cookies#csrf-prevention)
  csrf: [APP_HOST_URL],
  typescript: {
    autoGenerate: true,
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: mongooseAdapter({
    url: DATABASE_URI,
  }),
  sharp: sharp,
  telemetry: false,
  plugins: [
    formBuilderPlugin({
      fields: {
        state: false, // we do not use states in CH
      },
    }),
    s3StorageConfiguration,
    searchPluginConfiguration,
  ],
  i18n: {
    fallbackLanguage: LOCALE.DE,
    supportedLanguages: { en, de, fr },
  },
  ...emailSettings,
};

// export the config for PayloadCMS
export default buildSecureConfig(dropRouteInfo(payloadConfig));
