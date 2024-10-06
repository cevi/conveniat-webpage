import { mongooseAdapter } from '@payloadcms/db-mongodb'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { en } from '@payloadcms/translations/languages/en'
import { de } from '@payloadcms/translations/languages/de'
import { fr } from '@payloadcms/translations/languages/fr'
import { BlogArticle } from '@/collections/BlogArticle'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    components: {
      beforeDashboard: [
        {
          path: '@/components/payload/dashboardWelcomeBanner',
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
      collections: ['blog-articles'],
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
    locales: [
      {
        label: {
          en: 'English',
          de: 'Englisch',
          fr: 'Anglais',
        },
        code: 'en-US',
      },
      {
        label: {
          en: 'German',
          de: 'Deutsch',
          fr: 'Allemand',
        },
        code: 'de-CH',
      },
      {
        label: {
          en: 'French',
          de: 'Französisch',
          fr: 'Français',
        },
        code: 'fr-FR',
      },
    ],
    defaultLocale: 'de-CH',
    fallback: true,
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
})
