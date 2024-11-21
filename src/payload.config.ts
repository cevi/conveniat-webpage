import { mongooseAdapter } from '@payloadcms/db-mongodb';
import { lexicalEditor } from '@payloadcms/richtext-lexical';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

import { Users } from './collections/Users';
import { Media } from './collections/Media';
import { BlogArticle } from '@/collections/BlogArticle';
import { en } from 'payload/i18n/en';
import { de } from 'payload/i18n/de';
import { fr } from 'payload/i18n/fr';
import { locales } from '@/utils/globalDefinitions';
import { buildSecureConfig } from '@/acces/secureConfig';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

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
          path: '@/components/payload/dashboardWelcomeBanner',
        },
      ],
      afterLogin: [
        {
          path: '@/components/payload/login',
        },
      ],
    },
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
    dateFormat: 'yyyy-MM-dd HH:mm',
    livePreview: {
      url: 'http://localhost:3000',
      collections: ['blog'],
    },
  },
  collections: [Users, Media, BlogArticle],
  editor: lexicalEditor(),
  globals: [
    {
      slug: 'seo',
      label: 'SEO',
      fields: [],
    },
    {
      slug: 'headerNav',
      fields: [],
    },
    {
      slug: 'footerNav',
      fields: [],
    },
  ],
  localization: {
    locales,
    defaultLocale: 'de-CH',
    fallback: false,
  },
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    autoGenerate: true,
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: mongooseAdapter({
    url: process.env.DATABASE_URI || '',
  }),
  sharp,
  telemetry: false,
  plugins: [],
  i18n: {
    fallbackLanguage: 'en',
    supportedLanguages: { en, de, fr },
  },
});
