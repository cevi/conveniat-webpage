import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

/** Reads a comma-separated list of Cevi.DB group ids. */
const parseGroupIds = (value: string): number[] =>
  value
    .split(',')
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isInteger(n) && n > 0);

/** The groups of a role every deployment has to name. */
const groupIds = z.string().transform(parseGroupIds);

/** The groups of a role a deployment may leave out, which leaves the role without a holder. */
const optionalGroupIds = z.string().default('').transform(parseGroupIds);

export const environmentVariables = createEnv({
  /*
   * Server-side environment variables, not available on the client.
   * Will throw if you access these variables on the client.
   */
  server: {
    DATABASE_URI: z.url(),
    CHAT_DATABASE_URL: z.url(),
    REDIS_URL: z.url(),
    PAYLOAD_SECRET: z.string().min(5),
    APP_HOST_URL: z.url(),
    NODE_ENV: z.string().default('development'),
    NEXTAUTH_URL: z.url(),
    AUTH_TRUST_HOST: z.string().transform((value) => value === 'true'),
    NEXTAUTH_SECRET: z.string().min(5),
    JWT_SECRET: z.string().min(5),
    HITOBITO_BASE_URL: z.url(),
    HITOBITO_FORWARD_URL: z.url(),
    API_TOKEN: z.string().default(''),
    // Destructive: resets every participant to `new` and overwrites their PDFs and
    // invoice numbers. Off unless a deployment opts in explicitly.
    BILLING_ALLOW_REGENERATE_ALL: z
      .string()
      .optional()
      .transform((value) => value === 'true'),
    BREVO_API_KEY: z.string().optional(),
    GOOGLE_TRANSLATE_API_KEY: z.string().optional(),
    FIREBASE_SERVICE_ACCOUNT_KEY_PATH: z.string().optional(),

    // Access control: the Cevi.DB groups that hold each role, see `access-rules/roles.ts`
    CEVIDB_GROUP_FULL_ADMIN: groupIds,
    CEVIDB_GROUP_WEB_CORE_TEAM: groupIds,
    CEVIDB_GROUP_TRANSLATION_TEAM: groupIds,
    CEVIDB_GROUP_PROGRAM_TEAM: groupIds,

    /**
     * optional: Cevi.DB groups of the billing team, which opens the admin panel for the billing
     * and nothing else. Without it, nobody reaches the billing.
     */
    BILLING_ADMIN_GROUP_ID: optionalGroupIds,

    /** optional: without it, only full admins run the material depot */
    CEVIDB_GROUP_MATERIAL_TEAM: optionalGroupIds,

    /**
     * optional: Cevi.DB groups whose members staff the forum's Zentrale all year, e.g. the
     * people at the Zentrale desk. Without it, the full admins and the web core team do.
     */
    CEVIDB_GROUP_FORUM_ZENTRALE: optionalGroupIds,

    /**
     * optional: the Cevi.DB group whose tree the camp functions are synced from, e.g. the
     * Projektleitung. Without it, nobody gets a function.
     */
    CEVIDB_FUNCTIONS_ROOT_GROUP_ID: z
      .string()
      .regex(/^\d{0,6}$/)
      .default(''),

    /**
     * optional: Cevi.DB groups whose members review the Hof dashboard, e.g. the Ressorts
     * Infrastruktur and Programm. Grants the dashboard only, not the admin panel.
     */
    CEVIDB_GROUP_HOF_DASHBOARD_REVIEWERS: optionalGroupIds,

    /**
     * optional: Cevi.DB groups of security and first aid, who read the NFC wristbands. Without
     * it, only full admins do.
     */
    CEVIDB_GROUP_SAFETY_TEAM: optionalGroupIds,

    CEVI_DB_CLIENT_ID: z.string().min(1),
    CEVI_DB_CLIENT_SECRET: z.string().min(1),
    S3_ACCESS_KEY_ID: z.string().min(5),
    S3_SECRET_ACCESS_KEY: z.string().min(5),
    S3_BUCKET_NAME: z.string().min(5),
    /**
     * Bucket for bill PDFs. Optional: unset means they stay in `S3_BUCKET_NAME`
     * alongside every other upload, which is where they are today. The bucket has to
     * exist before this is set — nothing creates it.
     */
    S3_BILL_PDF_BUCKET_NAME: z.string().min(3).optional(),
    /**
     * Bucket for the files handed in with forms, kept apart from the public uploads. Optional:
     * unset means they stay in `S3_BUCKET_NAME`. The bucket has to exist before this is set;
     * the next start moves the existing form files into it.
     */
    S3_FORM_FILE_BUCKET_NAME: z.string().min(3).optional(),
    // Holds the attachments of mails waiting in the outgoing queue, until they are sent.
    S3_MAIL_ATTACHMENT_BUCKET_NAME: z.string().min(3).optional(),
    S3_HOST: z.url(),
    S3_PUBLIC_HOST: z.url(),
    ENABLE_NODEMAILER: z.string().transform((value) => value === 'true'),
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.coerce.number().optional(),
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),
    // How many queued mails (bills, reminders, reports) may leave per rolling hour. The
    // rest of the mail server's hourly limit stays free for mail somebody is waiting for,
    // like a form confirmation.
    BACKGROUND_EMAIL_HOURLY_LIMIT: z.coerce.number().int().min(1).default(50),
    VAPID_PRIVATE_KEY: z.string().min(5),
    FEATURE_ENABLE_APP_FEATURE: z.string().transform((value) => value === 'true'),
    FEATURE_ENABLE_WORKFLOWS: z
      .string()
      .transform((value) => value === 'true')
      .default(true),
    FEATURE_ENABLE_REGISTRATION_MANAGEMENT: z
      .string()
      .transform((value) => value === 'true')
      .default(false),
    FEATURE_ENABLE_PRESENCE_TRACKING: z
      .string()
      .transform((value) => value === 'true')
      .default(false),
    FEATURE_ENABLE_MATERIAL_MANAGEMENT: z
      .string()
      .transform((value) => value === 'true')
      .default(false),
    FEATURE_ENABLE_HOF_DASHBOARD: z
      .string()
      .transform((value) => value === 'true')
      .default(false),
    FEATURE_ENABLE_NFC_WRISTBANDS: z
      .string()
      .transform((value) => value === 'true')
      .default(false),
    /** the story for Leitende and the Challenges in the app, see `src/features/story` */
    FEATURE_ENABLE_STORY: z
      .string()
      .transform((value) => value === 'true')
      .default(false),
    /**
     * The key the write password of every NFC wristband is derived from. Required once the
     * wristbands are on, and fixed from the first band programmed: changing it locks every
     * programmed band against the app. Generate with `openssl rand -hex 32`.
     */
    NFC_TAG_SECRET: z.string().min(32).optional(),
    /**
     * Accepts bands without NXP's originality signature, like the cheap stickers used for
     * testing. Never on a deployment that hands out real bands.
     */
    NFC_ALLOW_UNSIGNED_TAGS: z
      .string()
      .transform((value) => value === 'true')
      .default(false),
    // the Besuchstag registration of conveniat27; konekta has no Besuchstag
    FEATURE_ENABLE_VISIT_DAY: z
      .string()
      .transform((value) => value === 'true')
      .default(false),

    // Map Config
    CAMP_MAP_INITIAL_ZOOM: z.coerce.number(),
    CAMP_MAP_INITIAL_MAP_CENTER: z.string(),
    // degrees clockwise from north, so a long campsite can fill a portrait screen
    CAMP_MAP_INITIAL_BEARING: z.coerce.number().default(0),
    APP_SUPPORT_EMAIL: z.email(),
  },
  /*
   * Environment variables available on the client (and server).
   *
   * 💡 You'll get type errors if these are not prefixed with NEXT_PUBLIC_.
   */
  client: {
    NEXT_PUBLIC_APP_HOST_URL: z.url(),
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: z.string(),
    NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),
    NEXT_PUBLIC_POSTHOG_HOST: z.url(),
    NEXT_PUBLIC_ENABLE_CON27_SHORT_URLS: z.boolean(),
    /**
     * Comma separated list of the locales this deployment serves, e.g. `de,fr`.
     *
     * Unset means "all locales" (conveniat27); the konekta deployment restricts it to German
     * and French. German is always kept, it is the default and fallback locale.
     *
     * This is a build time flag: it is inlined into the client bundle, because the language
     * switchers are client components. It is read in
     * `@/features/payload-cms/payload-cms/locales`, not through this module — that module has to
     * stay dependency free for the proxy (middleware) bundle.
     */
    NEXT_PUBLIC_ENABLED_LOCALES: z.string().optional(),
    NEXT_PUBLIC_DISABLE_SERWIST: z.boolean().default(false),
    NEXT_PUBLIC_HITOBITO_API_URL: z.url().optional(),
    /**
     * The deployment's app in the App Store and on Google Play, offered to a browser on the app
     * pages. A build time value, set per deployment; unset hides the store's button, and with
     * neither set the deployment offers no app at all (konekta).
     */
    NEXT_PUBLIC_APP_STORE_URL: z.url().optional(),
    NEXT_PUBLIC_PLAY_STORE_URL: z.url().optional(),
    /**
     * The website's menu: `top-nav` (conveniat27) or `side-nav` (konekta, and the default).
     *
     * A build time value, not a feature flag: the root layout draws it into the shell that
     * `next build` prerenders, and the build cannot read Redis. A runtime flag left that shell
     * with the build's default, so the first request to every page after a deploy showed the
     * other menu.
     */
    NEXT_PUBLIC_NAVIGATION_MODE: z.enum(['top-nav', 'side-nav']),
  },

  experimental__runtimeEnv: {
    NEXT_PUBLIC_APP_HOST_URL: process.env['NEXT_PUBLIC_APP_HOST_URL'],
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: process.env['NEXT_PUBLIC_VAPID_PUBLIC_KEY'],
    NEXT_PUBLIC_POSTHOG_KEY: process.env['NEXT_PUBLIC_POSTHOG_KEY'],
    NEXT_PUBLIC_POSTHOG_HOST: process.env['NEXT_PUBLIC_POSTHOG_HOST'],
    NEXT_PUBLIC_ENABLE_CON27_SHORT_URLS:
      process.env['NEXT_PUBLIC_ENABLE_CON27_SHORT_URLS'] === 'true',
    NEXT_PUBLIC_ENABLED_LOCALES: process.env['NEXT_PUBLIC_ENABLED_LOCALES'],
    NEXT_PUBLIC_DISABLE_SERWIST: process.env['NEXT_PUBLIC_DISABLE_SERWIST'] === 'true',
    NEXT_PUBLIC_HITOBITO_API_URL: process.env['NEXT_PUBLIC_HITOBITO_API_URL'],
    NEXT_PUBLIC_APP_STORE_URL: process.env['NEXT_PUBLIC_APP_STORE_URL'],
    NEXT_PUBLIC_PLAY_STORE_URL: process.env['NEXT_PUBLIC_PLAY_STORE_URL'],
    // compared here, not defaulted by the schema: the production build skips validation
    NEXT_PUBLIC_NAVIGATION_MODE:
      process.env['NEXT_PUBLIC_NAVIGATION_MODE'] === 'top-nav' ? 'top-nav' : 'side-nav',
  },

  /**
   * By default, this library will feed the environment variables directly to
   * the Zod validator.
   *
   * This means that if you have an empty string for a value that is supposed
   * to be a number (e.g. `PORT=` in a ".env" file), Zod will incorrectly flag
   * it as a type mismatch violation. Additionally, if you have an empty string
   * for a value that is supposed to be a string with a default value (e.g.
   * `DOMAIN=` in an ".env" file), the default value will never be applied.
   *
   * In order to solve these issues, we recommend that all new projects
   * explicitly specify this option as true.
   */
  emptyStringAsUndefined: true,

  // we don't want to validate the env variables during a production build
  // env variables for production are not available during the build time
  skipValidation:
    process.env['BUILD_TARGET'] === 'production' || process.env['CHECK_ENV_VARIABLES'] === 'false',
});
