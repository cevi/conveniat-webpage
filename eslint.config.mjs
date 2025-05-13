import { fixupConfigRules } from '@eslint/compat';
import { FlatCompat } from '@eslint/eslintrc';
import js from '@eslint/js';
import progress from 'eslint-plugin-file-progress';
import nodePlugin from 'eslint-plugin-n';
import noRelativeImportPaths from 'eslint-plugin-no-relative-import-paths';
import prettierConfigRecommended from 'eslint-plugin-prettier/recommended';
import reactNamingConvention from 'eslint-plugin-react-naming-convention';
import eslintPluginUnicorn from 'eslint-plugin-unicorn';
import * as fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript-eslint';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

const patchedConfig = fixupConfigRules([...compat.extends('next/core-web-vitals')]);

const features_folder = [
  'next-auth',
  'chat',
  'map',
  'schedule',
  'onboarding',
  'service-worker',
  'emergency',
  'payload-cms',
];

// assert that all folders in src/features are in the features array
const featuresDir = path.join(__dirname, 'src', 'features');
const featuresFiles = await fs.promises.readdir(featuresDir);
const featuresFolders = featuresFiles.filter(async (file) => {
  const stat = await fs.promises.stat(path.join(featuresDir, file));
  return stat.isDirectory();
});
const featuresFoldersSet = new Set(featuresFolders);
const featuresSet = new Set(features_folder);
const missingFeatures = [...featuresFoldersSet].filter((feature) => !featuresSet.has(feature));
if (missingFeatures.length > 0) {
  throw new Error(
    `Missing features in the features array: ${missingFeatures.join(', ')}.
    Consider adding them to the features_folder array in eslint.config.mjs!`,
  );
}

const config = [
  progress.configs.recommended,
  ...patchedConfig,
  ...ts.configs.recommended,
  prettierConfigRecommended,
  eslintPluginUnicorn.configs['flat/recommended'],
  {
    files: ['**/next-env.d.ts'],
    rules: {
      'unicorn/prevent-abbreviations': 'off',
    },
  },
  {
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.json'],
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      'react-naming-convention': reactNamingConvention,
      'no-relative-import-paths': noRelativeImportPaths,
    },
    rules: {
      // react-naming-convention recommended rules
      'react-naming-convention/filename-extension': ['warn', 'as-needed'],
      'react-naming-convention/use-state': 'warn',
      'react-hooks/exhaustive-deps': 'error',
      'react-hooks/rules-of-hooks': 'error',
      'no-relative-import-paths/no-relative-import-paths': [
        'error',
        { allowSameFolder: false, rootDir: 'src', prefix: '@' },
      ],
    },
  },
  {
    // we check typescript naming conventions only for typescript files
    files: ['**/*.{ts}', '**/*.{tsx}'],
    rules: { '@typescript-eslint/naming-convention': 'warn' },
  },

  // disallow directly accessing process.env, use the config file instead
  {
    plugins: { n: nodePlugin },
    rules: { 'n/no-process-env': ['error'] },
    ignores: [
      'src/config/environment-variables.ts', // ignore the env extractor
      'next.config.ts', // ignore NextJS config
      'src/features/service-worker/**/*.ts', // ignore service worker
    ],
  },

  {
    rules: {
      'prefer-const': 'error',
      complexity: ['error', { max: 10 }],
      'no-shadow': 'error',
      'no-nested-ternary': 'error',
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
                except: [`./${feature}`, './payload-cms'],
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
              ],
            },
          ],
        },
      ],
    },
  },
  {
    ignores: [
      // js files cannot be type checked
      '**/*.js',
      '**/*.mjs',
      // some next.js files should not be checked
      '.next/*',
      // some payload files should not be checked
      '**/payload-types.ts',
      '**/(payload)/admin/*/not-found.tsx',
      '**/(payload)/admin/*/page.tsx',
      '**/(payload)/layout.tsx',
      'src/build.ts',
      'src/lib/prisma', // auto generated by prisma
    ],
  },
];

export default config;
