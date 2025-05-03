import { environmentVariables } from '@/config/environment-variables';
import { buildSecureConfig } from '@/features/payload-cms/payload-cms/access-rules/build-secure-config';
import { collectionsConfig } from '@/features/payload-cms/payload-cms/collections';
import { UserCollection } from '@/features/payload-cms/payload-cms/collections/user-collection';
import { emailSettings } from '@/features/payload-cms/payload-cms/email-settings';
import { dropRouteInfo } from '@/features/payload-cms/payload-cms/global-routes';
import { globalConfig } from '@/features/payload-cms/payload-cms/globals';
import { onPayloadInit } from '@/features/payload-cms/payload-cms/initialization';
import { LOCALE, locales } from '@/features/payload-cms/payload-cms/locales';
import { lexicalEditor } from '@/features/payload-cms/payload-cms/plugins/lexical-editor';
import { s3StorageConfiguration } from '@/features/payload-cms/payload-cms/plugins/s3-storage-plugin-configuration';
import { searchPluginConfiguration } from '@/features/payload-cms/payload-cms/plugins/search/search-plugin-configuration';
import type { RoutableConfig } from '@/types/types';
import { mongooseAdapter } from '@payloadcms/db-mongodb';
import { formBuilderPlugin } from '@payloadcms/plugin-form-builder';
import { redirectsPlugin } from '@payloadcms/plugin-redirects';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { CollectionConfig, Locale } from 'payload';
import { de } from 'payload/i18n/de';
import { en } from 'payload/i18n/en';
import { fr } from 'payload/i18n/fr';
import sharp from 'sharp';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

const smartphoneBreakpoints: {
  height: number | string;
  label: string;
  name: string;
  width: number | string;
}[] = [
  {
    name: 'iphone-se',
    label: 'iPhone SE (375x667)',
    width: 375,
    height: 667,
  },
  {
    name: 'iphone-xr',
    label: 'iPhone XR (414x896)',
    width: 414,
    height: 896,
  },
  {
    name: 'iphone-14',
    label: 'iPhone 14 (390x844)',
    width: 390,
    height: 844,
  },
  {
    name: 'iphone-14-pro',
    label: 'iPhone 14 Pro (393x852)',
    width: 393,
    height: 852,
  },
  {
    name: 'iphone-14-pro-max',
    label: 'iPhone 14 Pro Max (430x932)',
    width: 430,
    height: 932,
  },
  {
    name: 'google-pixel-6',
    label: 'Google Pixel 6 (393x851)',
    width: 393,
    height: 851,
  },
  {
    name: 'google-pixel-7',
    label: 'Google Pixel 7 (412x870)',
    width: 412,
    height: 870,
  },
  {
    name: 'google-pixel-7-pro',
    label: 'Google Pixel 7 Pro (412x892)',
    width: 412,
    height: 892,
  },
];

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
  console.log(
    `${environmentVariables.APP_HOST_URL}/${locale.code}${
      collectionConfig && collectionConfig.slug === 'blog' ? `/blog/${urlSlug}` : ''
    }?preview=true`,
  );
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
      collections: ['blog', 'generic-page'],
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
    formBuilderPlugin({
      fields: {
        state: false, // we do not use states in CH
      },
    }),
    s3StorageConfiguration,
    searchPluginConfiguration,
    redirectsPlugin({
      collections: ['blog', 'generic-page'],
    }),
  ],
  i18n: {
    fallbackLanguage: LOCALE.DE,
    supportedLanguages: { en, de, fr },
  },
  ...emailSettings,
};

// export the config for PayloadCMS
export default buildSecureConfig(dropRouteInfo(payloadConfig));
