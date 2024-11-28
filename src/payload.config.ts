import { mongooseAdapter } from '@payloadcms/db-mongodb';
import {
  HeadingFeature,
  ItalicFeature,
  lexicalEditor,
  LinkFeature,
} from '@payloadcms/richtext-lexical';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

import { UserCollection } from '@/payload-cms/collections/user-collection';
import { MediaCollection } from '@/payload-cms/collections/media-collection';
import { BlogArticleCollection } from '@/payload-cms/collections/blog-article-collection';
import { en } from 'payload/i18n/en';
import { de } from 'payload/i18n/de';
import { fr } from 'payload/i18n/fr';
import { locales } from '@/payload-cms/locales';
import { buildSecureConfig } from '@/payload-cms/access-rules/build-secure-config';
import { FooterGlobal } from '@/payload-cms/globals/footer-global';
import { SeoGlobal } from '@/payload-cms/globals/seo-global';
import { HeaderGlobal } from '@/payload-cms/globals/header-global';
import { PWAGlobal } from '@/payload-cms/globals/pwa-global';
import { LandingPageGlobal } from '@/payload-cms/globals/landing-page-global';
import { formBuilderPlugin } from '@payloadcms/plugin-form-builder';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

const PAYLOAD_SECRET = process.env['PAYLOAD_SECRET'] ?? '';
const DATABASE_URI = process.env['DATABASE_URI'] ?? '';
const APP_HOST_URL = process.env['APP_HOST_URL'] ?? '';

/*
if (PAYLOAD_SECRET === undefined) throw new Error('PAYLOAD_SECRET is not defined');
if (DATABASE_URI === undefined) throw new Error('DATABASE_URI is not defined');
*/

export default buildSecureConfig({
  admin: {
    meta: {
      title: 'Conveniat 2027 - Admin Panel',
      icons: [
        {
          rel: 'icon',
          type: 'image/svg+xml',
          url: '/favicon.svg',
        },
      ],
    },
    components: {
      beforeDashboard: [
        {
          path: '@/payload-cms/components/dashboard-welcome-banner',
        },
      ],
      afterLogin: [
        {
          path: '@/payload-cms/components/login-page/login-button',
        },
      ],
    },
    user: UserCollection.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
    dateFormat: 'yyyy-MM-dd HH:mm',
    livePreview: {
      url: APP_HOST_URL,
      collections: ['blog'],
    },
  },
  collections: [UserCollection, MediaCollection, BlogArticleCollection],
  editor: lexicalEditor({
    features: [
      ItalicFeature(),
      LinkFeature(),
      HeadingFeature({
        enabledHeadingSizes: ['h2', 'h3'],
      }),
    ],
  }),
  globals: [SeoGlobal, HeaderGlobal, FooterGlobal, PWAGlobal, LandingPageGlobal],
  localization: {
    locales,
    defaultLocale: 'de-CH',
    fallback: false,
  },
  graphQL: {
    disable: true,
    disablePlaygroundInProduction: true,
  },
  secret: PAYLOAD_SECRET,
  typescript: {
    autoGenerate: true,
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: mongooseAdapter({
    url: DATABASE_URI,
  }),
  sharp,
  telemetry: false,
  plugins: [formBuilderPlugin({})],
  i18n: {
    fallbackLanguage: 'en',
    supportedLanguages: { en, de, fr },
  },
});
