import path from 'node:path'
import { fileURLToPath } from 'node:url'
import js from '@eslint/js'
import eslint from '@eslint/js'
import { FlatCompat } from '@eslint/eslintrc'
import { fixupPluginRules } from '@eslint/compat'
import tsEslint from 'typescript-eslint'
import reactNamingConvention from 'eslint-plugin-react-naming-convention'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
})

const pluginsToPatch = ['@next/next', 'react-hooks', 'prettier/recommended']

const compatConfig = [...compat.extends('next/core-web-vitals')]

const patchedConfig = compatConfig.map((entry) => {
  const plugins = entry.plugins
  for (const key in plugins) {
    if (Object.prototype.hasOwnProperty.call(plugins, key) && pluginsToPatch.includes(key)) {
      plugins[key] = fixupPluginRules(plugins[key])
    }
  }
  return entry
})

const config = [
  eslint.configs.recommended,
  ...tsEslint.configs.recommendedTypeChecked,
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
    },
  },
  {
    // we check typescript naming conventions only for typescript files
    files: ['**/*.{ts}'],
    rules: { '@typescript-eslint/naming-convention': 'warn' },
  },
  {
    rules: {
      'prefer-const': 'error',
      complexity: ['warn', { max: 5 }],
      'no-shadow': 'warn',
      'no-nested-ternary': 'warn',
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-unnecessary-condition': 'warn',
      '@typescript-eslint/no-floating-promises': 'warn',
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
    ],
  },
  ...patchedConfig,
]

export default config
