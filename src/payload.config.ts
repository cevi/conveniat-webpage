import { mongooseAdapter } from '@payloadcms/db-mongodb';
import {
  BoldFeature,
  defaultEditorLexicalConfig,
  FixedToolbarFeature,
  HeadingFeature,
  ItalicFeature,
  lexicalEditor,
  LexicalEditorProps,
  ParagraphFeature,
} from '@payloadcms/richtext-lexical';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

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
import { LocalizedCollectionPage, LocalizedPage } from '@/page-layouts/localized-page';
import { ImprintPage } from '@/page-layouts/imprint-page';
import React from 'react';
import { onPayloadInit } from '@/payload-cms/on-payload-init';
import { PrivacyPage } from '@/page-layouts/privacy-page';
import { DocumentsCollection } from '@/payload-cms/collections/documents-collection';
import { dropRouteInfo } from '@/payload-cms/global-routes';
import { BlogPostPage } from '@/page-layouts/blog-posts';
import { GenericPage as GenericPageCollection } from '@/payload-cms/collections/generic-page';
import { GenericPage } from '@/page-layouts/generic-page';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

const PAYLOAD_SECRET = process.env['PAYLOAD_SECRET'] ?? '';
const DATABASE_URI = process.env['DATABASE_URI'] ?? '';
const APP_HOST_URL = process.env['APP_HOST_URL'] ?? '';

/*
if (PAYLOAD_SECRET === undefined) throw new Error('PAYLOAD_SECRET is not defined');
if (DATABASE_URI === undefined) throw new Error('DATABASE_URI is not defined');
*/

export type RoutableCollectionConfig = {
  urlPrefix: {
    [locale in 'de' | 'en' | 'fr']: string;
  };
  reactComponent: React.FC<LocalizedCollectionPage>;
  payloadCollection: CollectionConfig;
};

export type RoutableGlobalConfig = {
  urlSlug: {
    [locale in 'de' | 'en' | 'fr']: string;
  };
  reactComponent: React.FC<LocalizedPage>;
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
    FixedToolbarFeature(),
  ];
};

const collectionConfig: RoutableCollectionConfigs = [
  // routable collections
  {
    urlPrefix: { de: 'blog', en: 'blog', fr: 'blog' },
    reactComponent: BlogPostPage,
    payloadCollection: BlogArticleCollection,
  },
  {
    urlPrefix: { de: '', en: '', fr: '' },
    reactComponent: GenericPage,
    payloadCollection: GenericPageCollection,
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
    reactComponent: PrivacyPage,
    payloadGlobal: DataPrivacyStatementGlobal,
  },
  {
    urlSlug: { de: 'impressum', en: 'imprint', fr: 'mentions-legales' },
    reactComponent: ImprintPage,
    payloadGlobal: ImprintGlobal,
  },

  HeaderGlobal,
  FooterGlobal,
  SeoGlobal,
  PWAGlobal,
];

export const payloadConfig: RoutableConfig = {
  onInit: onPayloadInit,
  admin: {
    avatar: 'default',
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
      collections: [], // ['blog'], // TODO: live preview breaks multi-locale editing
    },
  },
  collections: collectionConfig,
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
  plugins: [formBuilderPlugin({})],
  i18n: {
    fallbackLanguage: 'en',
    supportedLanguages: { en, de, fr },
  },
};

// export the config for PayloadCMS
export default buildSecureConfig(dropRouteInfo(payloadConfig));
