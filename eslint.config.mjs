import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import eslintConfigPrettier from 'eslint-config-prettier';
import progress from 'eslint-plugin-file-progress';
import nodePlugin from 'eslint-plugin-n';
import noRelativeImportPaths from 'eslint-plugin-no-relative-import-paths';
import reactNamingConvention from 'eslint-plugin-react-naming-convention';
import eslintPluginUnicorn from 'eslint-plugin-unicorn';
import { defineConfig, globalIgnores } from 'eslint/config';
import * as fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript-eslint';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const features_folder = [
  'next-auth',
  'chat',
  'map',
  'schedule',
  'onboarding',
  'service-worker',
  'emergency',
  'marketing',
  'payload-cms',
  'settings',
  'image-submission',
  'admin',
  'permissions',
  'push-notifications',
  'push-tracking',
  'auth',
  'registration_process',
  'billing',
  'native-push',
  'presence',
  'photo-contest',
];

const featuresDirectory = path.join(__dirname, 'src', 'features');
const featuresFiles = await fs.promises.readdir(featuresDirectory);
const stats = await Promise.all(
  featuresFiles.map((file) => fs.promises.stat(path.join(featuresDirectory, file))),
);
const featuresFolders = featuresFiles.filter((file, index) => stats[index].isDirectory());
const featuresFoldersSet = new Set(featuresFolders);
const featuresSet = new Set(features_folder);
const missingFeatures = [...featuresFoldersSet].filter((feature) => !featuresSet.has(feature));
if (missingFeatures.length > 0) {
  throw new Error(
    `Missing features in the features array: ${missingFeatures.join(', ')}.
    Consider adding them to the features_folder array in eslint.config.mjs!`,
  );
}

const config = defineConfig([
  // 1. Base Configs
  ...ts.configs.recommendedTypeChecked,

  {
    languageOptions: {
      parserOptions: {
        projectService: true,
      },
    },
  },

  ...nextVitals,
  ...nextTs,
  eslintPluginUnicorn.configs['flat/recommended'],
  progress.configs.recommended,

  // 2. Global Rule Overrides
  {
    rules: {
      'unicorn/prevent-abbreviations': [
        'error',
        {
          allowList: {
            params: true, // parameters
            ctx: true, // context in trpc
            args: true, // arguments
            props: true, // properties
            db: true, // database
            tx: true, // transaction
            val: true, // value
            env: true, // environment

            // Next.js functions
            generateStaticParams: true,
            dynamicParams: true,
          },
        },
      ],
      'unicorn/no-array-reduce': 'off',

      // Other global rules
      'prefer-const': 'error',
      'no-shadow': 'error',
      'no-nested-ternary': 'error',
      semi: 'error',
      'no-control-regex': 'warn',
      'no-useless-escape': 'warn',
    },
  },

  // 3. Node.js specific rules
  {
    plugins: { n: nodePlugin },
    rules: { 'n/no-process-env': ['error'] },
    ignores: [
      'src/config/environment-variables.ts', // ignore the env extractor
      'next.config.ts', // ignore NextJS config
      'src/features/service-worker/**/*.ts', // ignore service worker
    ],
  },

  // 3b. Logging: prefer the shared logger over console.* — see #1525.
  //
  // `console.log`/`info`/`debug`/`trace` are not bridged into Loki (see
  // `src/utils/otel-console-bridge.ts`), so they are invisible in Grafana and
  // cannot be levelled per environment. Server code should use
  // `createLogger` from `@/utils/server-logger`, or `req.payload.logger` where a
  // Payload request is in scope. `warn`/`error` stay allowed: the console bridge
  // ships those as a safety net for failures nobody routed properly.
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: { 'no-console': ['error', { allow: ['warn', 'error'] }] },
    ignores: [
      // Permanent: no server logger exists in these contexts.
      'src/features/service-worker/**', // browser / service-worker context
      'src/components/service-worker/**', // browser / service-worker context
      'src/utils/service-worker-utils.ts', // browser context
      'src/scripts/**', // CLI scripts — stdout is the user interface
      'src/utils/startup-banner.ts', // prints a banner, not log records
      '**/__tests__/**',

      // Temporary: not yet migrated. This list shrinks per area as #1525
      // progresses; do not add to it.
      // Bracketed route segments are glob character classes, so these are matched by directory.
      'src/app/(frontend)/**/app/chat/new-chat-with-user/**',
      'src/app/(frontend)/**/(payload-pages)/**',
      'src/app/(onboarding)/entrypoint/page.tsx',
      'src/app/(payload)/api/flush-cache/route.ts',
      'src/app/global-error.tsx',
      'src/features/billing/services/sync-service.ts',
      'src/features/chat/api/mutations/create-chat.ts',
      'src/features/chat/api/mutations/create-message.ts',
      'src/features/chat/api/utils/send-push-notifications.ts',
      'src/features/chat/components/chat-view/message/index.tsx',
      'src/features/chat/hooks/use-archive-chat-mutation.ts',
      'src/features/chat/hooks/use-chat-sse.ts',
      'src/features/chat/hooks/use-chats.ts',
      'src/features/chat/hooks/use-offline-queue-processor.ts',
      'src/features/chat/hooks/use-update-chat-mutation.ts',
      'src/features/emergency/api/emergency-router.ts',
      'src/features/emergency/components/emergency-component.tsx',
      'src/features/map/components/map-annotations/drawer-header.tsx',
      'src/features/native-push/api/native-push-router.ts',
      'src/features/next-auth/utils/next-auth-config.ts',
      'src/features/onboarding/hooks/use-onboarding.ts',
      'src/features/payload-cms/page-layouts/generic-page.tsx',
      'src/features/payload-cms/payload-cms/components/form-submissions-download.ts',
      'src/features/payload-cms/payload-cms/components/live-preview-restorer.tsx',
      'src/features/payload-cms/payload-cms/initialization/**',
      'src/features/payload-cms/payload-cms/shared-fields/map-polygon/map-polygon-field.tsx',
      'src/features/payload-cms/payload-cms/shared-fields/slug-field.ts',
      'src/features/payload-cms/payload-cms/utils/flush-page-cache-on-change.ts',
      'src/features/payload-cms/utils/preview/preview-utils.tsx',
      'src/features/settings/profile-details.tsx',
      'src/hooks/use-native-push.ts',
      'src/instrumentation.ts',
      'src/lib/chat-sync.ts',
      'src/lib/toast.ts',
      'src/providers/post-hog-provider.tsx',
      'src/proxy/design-rewrite-proxy.ts',
      'src/tracing.ts',
      'src/utils/generate-manifest.ts',
      'src/utils/login-handler.ts',
      'src/utils/push-notification-api.ts',
    ],
  },

  // 4. Consolidated TypeScript & React Custom Rules
  // These rules are applied *on top of* the Next.js defaults.

  // typescript-eslint naming conventions
  {
    // we check typescript naming conventions only for typescript files
    files: ['**/*.{ts}', '**/*.{tsx}'],
    rules: { '@typescript-eslint/naming-convention': 'warn' },
  },

  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: {
      'react-naming-convention': reactNamingConvention,
      'no-relative-import-paths': noRelativeImportPaths,
    },
    // We no longer need languageOptions here, nextTs handles it.
    rules: {
      // react-naming-convention recommended rules
      'react-naming-convention/filename-extension': ['warn', 'as-needed'],
      'react-naming-convention/use-state': 'warn',

      // react-hooks (already in nextVitals, but explicit overrides are fine)
      'react-hooks/exhaustive-deps': 'error',
      'react-hooks/rules-of-hooks': 'error',

      // no-relative-import-paths
      'no-relative-import-paths/no-relative-import-paths': [
        'error',
        { allowSameFolder: false, rootDir: 'src', prefix: '@' },
      ],

      // All other custom TS/React rules
      '@typescript-eslint/ban-ts-comment': 'warn',
      '@typescript-eslint/no-unnecessary-condition': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/require-array-sort-compare': 'error',
      '@typescript-eslint/no-unused-vars': 'error',

      // stricter rules for type checking
      '@typescript-eslint/consistent-type-definitions': 'error',
      '@typescript-eslint/consistent-type-exports': 'error',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          prefer: 'type-imports',
          disallowTypeAnnotations: false,
        },
      ],
      '@typescript-eslint/consistent-type-assertions': 'error',
      '@typescript-eslint/explicit-function-return-type': 'error',

      'react/no-unstable-nested-components': 'error',
      'react/destructuring-assignment': 'error',

      'react/jsx-boolean-value': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/no-unsafe-argument': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-unsafe-return': 'error',

      '@typescript-eslint/no-unsafe-enum-comparison': 'error',
      '@typescript-eslint/prefer-promise-reject-errors': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/no-unsafe-call': 'error',
      '@typescript-eslint/prefer-for-of': 'error',
      '@typescript-eslint/prefer-nullish-coalescing': 'warn',
      '@typescript-eslint/prefer-optional-chain': 'error',
      '@typescript-eslint/restrict-plus-operands': [
        'error',
        {
          allowAny: false,
          allowBoolean: false,
          allowNullish: false,
          allowNumberAndString: false,
          allowRegExp: false,
        },
      ],
      '@typescript-eslint/restrict-template-expressions': 'error',
      '@typescript-eslint/strict-boolean-expressions': [
        'warn',
        {
          allowNumber: false,
          allowString: false,
        },
      ],
      '@typescript-eslint/use-unknown-in-catch-callback-variable': 'error',

      semi: 'error',
      'no-control-regex': 'warn',
      'no-useless-escape': 'warn',
      '@typescript-eslint/no-deprecated': 'warn',
      'unicorn/no-array-reduce': 'off',

      // import rules (from next/core-web-vitals)
      'import/no-restricted-paths': [
        'error',
        {
          zones: [
            // enforce unidirectional codebase:
            ...features_folder
              // no restrictions to payload-cms feature
              .filter((feature) => feature !== 'payload-cms')
              .map((feature) => ({
                target: `./src/features/${feature}`,
                from: './src/features',
                except: [
                  `./${feature}`,
                  './payload-cms',
                  // billing needs access to registration_process for Hitobito API client
                  ...(feature === 'billing' ? ['./registration_process'] : []),
                ],
                message: `Do not import from ${feature} directly, use the shared modules instead.`,
              })),

            // enforce unidirectional codebase:
            // e.g. src/app can import from src/features but not the other way around
            {
              target: './src/features',
              from: './src/app',
              message: 'Features should not import from app directory.',
            },

            // src/features and src/app can import from these shared modules but not the other way around
            {
              target: [
                './src/components',
                './src/hooks',
                './src/lib',
                './src/types',
                './src/utils',
              ],
              from: ['./src'],
              except: [
                './features/payload-cms', // payload-cms can be imported from anywhere
                './features/next-auth', // next-auth can be imported from anywhere
                './components',
                './hooks',
                './lib',
                './types',
                './utils',
                './config',
                './context',
                './trpc',
                './schemas',
              ],
            },
          ],
        },
      ],
    },
  },

  // 5. Prettier (Disables all conflicting formatting rules)
  eslintConfigPrettier,

  // 6. Global Ignores
  globalIgnores([
    // Default ignores from eslint-config-next
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',

    // Worktrees
    '*-worktree/**',
    '**/*-worktree/**',
    'worktrees/**',
    '**/worktrees/**',

    // this config file
    'eslint.config.mjs',

    // Custom project ignores
    '**/payload-types.ts',
    '**/(payload)/admin/*/not-found.tsx',
    '**/(payload)/admin/*/page.tsx',
    '**/(payload)/layout.tsx',
    'src/build.ts',
    'src/lib/prisma', // auto generated by prisma

    // js files
    'src/app/(payload)/admin/importMap.js',
    'postcss.config.js',
    '**/*.cjs',

    // Worktrees
    '**/*-worktree/**',

    // code coverage
    'coverage/**',

    // observability tools
    'observability/**',

    // service worker
    'public/sw.js',
    'public/sw.js.map',
    'serwist.config.js',
  ]),
]);

export default config;
