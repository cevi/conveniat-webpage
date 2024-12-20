import { mongooseAdapter } from '@payloadcms/db-mongodb';
import {
  BoldFeature,
  defaultEditorLexicalConfig,
  FixedToolbarFeature,
  HeadingFeature,
  ItalicFeature,
  lexicalEditor,
  ParagraphFeature,
} from '@payloadcms/richtext-lexical';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

import { UserCollection } from '@/payload-cms/collections/user-collection';
import { MediaCollection } from '@/payload-cms/collections/media-collection';
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
import { Config, GlobalConfig } from 'payload';
import { LocalizedPage } from '@/content-pages/localized-page';
import { ImprintPage } from '@/content-pages/imprint/page';
import React from 'react';
import { onPayloadInit } from '@/payload-cms/on-payload-init';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

const PAYLOAD_SECRET = process.env['PAYLOAD_SECRET'] ?? '';
const DATABASE_URI = process.env['DATABASE_URI'] ?? '';
const APP_HOST_URL = process.env['APP_HOST_URL'] ?? '';

/*
if (PAYLOAD_SECRET === undefined) throw new Error('PAYLOAD_SECRET is not defined');
if (DATABASE_URI === undefined) throw new Error('DATABASE_URI is not defined');
*/

export type RoutableGlobalConfig =
  | GlobalConfig
  | {
      urlSlug: {
        [locale in 'de' | 'en' | 'fr']: string;
      };
      reactComponent: React.FC<LocalizedPage>;
      payloadGlobal: GlobalConfig;
    };

export type RoutableConfig = Omit<Config, 'globals'> & {
  globals?: RoutableGlobalConfig[];
};

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
  collections: [BlogArticleCollection, MediaCollection, UserCollection],
  editor: lexicalEditor({
    features: () => {
      return [
        ItalicFeature(),
        BoldFeature(),
        ParagraphFeature(),
        HeadingFeature({
          enabledHeadingSizes: ['h2', 'h3'],
        }),
        FixedToolbarFeature(),
      ];
    },
    lexical: defaultEditorLexicalConfig,
  }),
  globals: [
    LandingPageGlobal,

    /*
     * TODO: I'm still not sure if that is the best way to define global pages. Anyway
     *     it works for now and is clean enough for this project.
     *
     * We should only define pages here that are special and enforced to be globally available.
     * For all other pages, we should use the collection config to define pages.
     */
    {
      urlSlug: { de: 'datenschutz', en: 'privacy', fr: 'protection-donnees' },
      reactComponent: ImprintPage,
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
  ],
  localization: {
    locales,
    defaultLocale: 'de-CH',
    fallback: false,
  },
  // we don't need GraphQL for this project, therefore we disable it
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
};

/**
 * Helper function to remove route information from the config.
 * This is necessary to make the extended config compatible with PayloadCMS.
 *
 * TODO: this function should create a readonly field in the backend
 *   displaying the chosen URL slug for the global page. Any
 *   existing global page with the same URL must be removed from the subcomponents.
 *
 * TODO: this function should validate that there are not two global pages
 *  with the same URL slug (how to handle different locales?)
 *
 * @param config
 */
const removeRouteInfo = (config: RoutableConfig): Config => ({
  ...config,
  globals:
    config.globals?.map((global) => ({
      ...('payloadGlobal' in global ? { ...global.payloadGlobal } : global),
    })) ?? [],
});

// export the config for PayloadCMS
export default buildSecureConfig(removeRouteInfo(payloadConfig));
