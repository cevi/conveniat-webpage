import path from 'node:path';
import { fileURLToPath } from 'node:url';
import js from '@eslint/js';
import ts from 'typescript-eslint';
import prettierConfigRecommended from 'eslint-plugin-prettier/recommended';
import reactNamingConvention from 'eslint-plugin-react-naming-convention';
import progress from 'eslint-plugin-file-progress';
import eslintPluginUnicorn from 'eslint-plugin-unicorn';
import { FlatCompat } from '@eslint/eslintrc';
import { fixupConfigRules } from '@eslint/compat';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

const patchedConfig = fixupConfigRules([...compat.extends('next/core-web-vitals')]);

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
    },
    rules: {
      // react-naming-convention recommended rules
      'react-naming-convention/filename-extension': ['warn', 'as-needed'],
      'react-naming-convention/use-state': 'warn',
      'react-hooks/exhaustive-deps': 'error',
      'react-hooks/rules-of-hooks': 'error',
    },
  },
  {
    // we check typescript naming conventions only for typescript files
    files: ['**/*.{ts}', '**/*.{tsx}'],
    rules: { '@typescript-eslint/naming-convention': 'warn' },
  },
  {
    rules: {
      'prefer-const': 'error',
      complexity: ['warn', { max: 5 }],
      'no-shadow': 'error',
      'no-nested-ternary': 'error',
      '@typescript-eslint/ban-ts-comment': 'warn',
      '@typescript-eslint/no-unnecessary-condition': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/require-array-sort-compare': 'error',
      '@typescript-eslint/no-unused-vars': 'error',

      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/no-unsafe-argument': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-unsafe-return': 'error',

      '@typescript-eslint/no-unsafe-enum-comparison': 'error',
      '@typescript-eslint/prefer-promise-reject-errors': 'error',
      '@typescript-eslint/explicit-function-return-type': 'warn',
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
      "src/build.ts",
    ],
  },
];

export default config;
