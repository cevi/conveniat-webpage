import { mongooseAdapter } from '@payloadcms/db-mongodb';
import {
  BlockquoteFeature,
  BoldFeature,
  defaultEditorLexicalConfig,
  FixedToolbarFeature,
  HeadingFeature,
  ItalicFeature,
  lexicalEditor,
  LexicalEditorProps,
  LinkFeature,
  ParagraphFeature,
  UnorderedListFeature,
} from '@payloadcms/richtext-lexical';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { s3Storage } from '@payloadcms/storage-s3';
import { searchPlugin } from '@payloadcms/plugin-search';
import { UserCollection } from '@/payload-cms/collections/user-collection';
import { ImageCollection } from '@/payload-cms/collections/image-collection';
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
import { BlogArticleCollection } from '@/payload-cms/collections/blog-article';
import { DataPrivacyStatementGlobal } from '@/payload-cms/globals/data-privacy-statement-global';
import { ImprintGlobal } from '@/payload-cms/globals/imprint-global';
import { CollectionConfig, Config, GlobalConfig } from 'payload';
import { onPayloadInit } from '@/payload-cms/on-payload-init';
import { DocumentsCollection } from '@/payload-cms/collections/documents-collection';
import { dropRouteInfo } from '@/payload-cms/global-routes';
import { GenericPage as GenericPageCollection } from '@/payload-cms/collections/generic-page';
import { Locale } from '@/types';
import { beforeSyncWithSearch } from '@/search/before-sync';
import { SearchGlobal } from '@/payload-cms/globals/search-global';
import { searchOverrides } from '@/search/search-overrides';
import { TimelineCollection } from './payload-cms/collections/timeline';
import { nodemailerAdapter } from '@payloadcms/email-nodemailer';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

const PAYLOAD_SECRET = process.env['PAYLOAD_SECRET'] ?? '';
const DATABASE_URI = process.env['DATABASE_URI'] ?? '';
//const APP_HOST_URL = process.env['APP_HOST_URL'] ?? ''; // not needed as live-preview is currently disabled

const MINIO_HOST = process.env['MINIO_HOST'] ?? '';
const MINIO_BUCKET_NAME = process.env['MINIO_BUCKET_NAME'] ?? '';
const MINIO_ACCESS_KEY_ID = process.env['MINIO_ACCESS_KEY_ID'] ?? '';
const MINIO_SECRET_ACCESS_KEY = process.env['MINIO_SECRET_ACCESS_KEY'] ?? '';

const ENABLE_MAIL = process.env['ENABLE_NODEMAILER'] === 'true';
const SMTP_HOST = process.env['SMTP_HOST'] ?? '';
const SMTP_PORT = process.env['SMTP_PORT'] ?? 0;
const SMTP_USER = process.env['SMTP_USER'] ?? '';
const SMTP_PASS = process.env['SMTP_PASS'] ?? '';

/*
if (PAYLOAD_SECRET === undefined) throw new Error('PAYLOAD_SECRET is not defined');
if (DATABASE_URI === undefined) throw new Error('DATABASE_URI is not defined');
*/

export type RoutableCollectionConfig = {
  urlPrefix: {
    [locale in Locale]: string;
  };
  /** Defines a unique identifier for the React component that should be used to render the page.
   * This identifier is used to lookup the component in the `reactComponentSlugLookup` table. */
  reactComponentSlug: 'blog-posts' | 'generic-page' | 'timeline-posts';
  /** The collection configuration that should be used to render the page. */
  payloadCollection: CollectionConfig;
};

export type RoutableGlobalConfig = {
  urlSlug: {
    [locale in Locale]: string;
  };
  /** Defines a unique identifier for the React component that should be used to render the page.
   * This identifier is used to lookup the component in the `reactComponentSlugLookup` table. */
  reactComponentSlug: 'privacy-page' | 'imprint-page' | 'search-page';
  /** The global configuration that should be used to render the page. */
  payloadGlobal: GlobalConfig;
};

export type RoutableGlobalConfigs = (GlobalConfig | RoutableGlobalConfig)[];
export type RoutableCollectionConfigs = (CollectionConfig | RoutableCollectionConfig)[];

export type RoutableConfig = Omit<Omit<Config, 'globals'>, 'collections'> & {
  globals?: RoutableGlobalConfigs;
  collections?: RoutableCollectionConfigs;
};

const defaultEditorFeatures: LexicalEditorProps['features'] = () => {
  return [
    ItalicFeature(),
    BoldFeature(),
    ParagraphFeature(),
    HeadingFeature({
      enabledHeadingSizes: ['h2', 'h3'],
    }),
    LinkFeature({
      fields: ({ defaultFields }) => [...defaultFields],
      // we only allow links to pages or blog posts
      // TODO: we should list the title or slug instead of the ID in the overview
      enabledCollections: ['generic-page', 'blog'],
    }),
    FixedToolbarFeature(),
    BlockquoteFeature(),
    UnorderedListFeature(),
  ];
};

const collectionsConfig: RoutableCollectionConfigs = [
  // routable collections
  {
    urlPrefix: { de: 'blog', en: 'blog', fr: 'blog' },
    reactComponentSlug: 'blog-posts',
    payloadCollection: BlogArticleCollection,
  },
  {
    urlPrefix: { de: '', en: '', fr: '' },
    reactComponentSlug: 'generic-page',
    payloadCollection: GenericPageCollection,
  },
  {
    urlPrefix: { de: 'zeitstrahl', en: 'timeline', fr: 'chronologie' },
    reactComponentSlug: 'timeline-posts',
    payloadCollection: TimelineCollection,
  },

  // general purpose collections
  ImageCollection,
  DocumentsCollection,
  UserCollection,
];

const globalConfig: RoutableGlobalConfigs = [
  LandingPageGlobal,

  /*
   * We should only define pages here that are special and enforced to be globally available.
   * For all other pages, we should use the collection config to define pages.
   */
  {
    urlSlug: { de: 'datenschutz', en: 'privacy', fr: 'protection-donnees' },
    reactComponentSlug: 'privacy-page',
    payloadGlobal: DataPrivacyStatementGlobal,
  },
  {
    urlSlug: { de: 'impressum', en: 'imprint', fr: 'mentions-legales' },
    reactComponentSlug: 'imprint-page',
    payloadGlobal: ImprintGlobal,
  },
  {
    urlSlug: { de: 'suche', en: 'search', fr: 'recherche' },
    reactComponentSlug: 'search-page',
    payloadGlobal: SearchGlobal,
  },

  HeaderGlobal,
  FooterGlobal,
  SeoGlobal,
  PWAGlobal,
];

/**
 * NodeMailer Adapter for sending emails via SMTP
 * @see https://payloadcms.com/docs/email/overview
 *
 * Note: The following environment variables must be set in order to enable email sending:
 * - ENABLE_NODEMAILER=true
 * - SMTP_HOST
 * - SMTP_PORT
 * - SMTP_USER
 * - SMTP_PASS
 *
 * By default, email sending is disabled for local development,
 * it must be enabled using ENABLE_NODEMAILER.
 */
const emailSettings = ENABLE_MAIL
  ? {
      email: nodemailerAdapter({
        defaultFromAddress: 'no-reply@conveniat27.ch',
        defaultFromName: 'conveniat27',
        transportOptions: {
          host: SMTP_HOST,
          port: SMTP_PORT,
          auth: {
            user: SMTP_USER,
            pass: SMTP_PASS,
          },
        },
      }),
    }
  : {};

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
          path: '@/payload-cms/components/login-page/login-button',
        },
      ],
    },
    user: UserCollection.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
    dateFormat: 'yyyy-MM-dd HH:mm',
    /*
    livePreview: {
      url: ({ data, collectionConfig, locale }) => {
        // TODO: fix typing in order to remove eslint-disable
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        const urlSlug: string = data['seo']?.['urlSlug'] || '';
        return `${APP_HOST_URL}${`/${locale.code}`}${
          collectionConfig && collectionConfig.slug === 'blog' ? `/blog/${urlSlug}` : ''
        }`;
      },
      collections: ['blog'],
    },
    */
  },
  collections: collectionsConfig,
  editor: lexicalEditor({
    features: defaultEditorFeatures,
    lexical: defaultEditorLexicalConfig,
  }),
  globals: globalConfig,
  localization: {
    locales,
    defaultLocale: 'de',
    fallback: false,
  },
  graphQL: {
    disable: true, // we don't need GraphQL for this project
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
  plugins: [
    formBuilderPlugin({
      fields: {
        state: false, // we do not use states in CH
      },
    }),
    s3Storage({
      collections: {
        images: true,
        documents: true,
      },
      bucket: MINIO_BUCKET_NAME,
      config: {
        credentials: {
          accessKeyId: MINIO_ACCESS_KEY_ID,
          secretAccessKey: MINIO_SECRET_ACCESS_KEY,
        },
        region: 'us-east-1',
        forcePathStyle: true,
        endpoint: MINIO_HOST,
      },
    }),
    searchPlugin({
      collections: ['blog'],
      defaultPriorities: {
        blog: 1,
      },
      searchOverrides: searchOverrides,
      beforeSync: beforeSyncWithSearch,
    }),
  ],
  i18n: {
    fallbackLanguage: 'en',
    supportedLanguages: { en, de, fr },
  },
  ...emailSettings,
};

// export the config for PayloadCMS
export default buildSecureConfig(dropRouteInfo(payloadConfig));
