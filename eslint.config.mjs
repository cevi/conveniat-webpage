import path from 'node:path'
import { fileURLToPath } from 'node:url'
import js from '@eslint/js'
import eslint from '@eslint/js'
import { FlatCompat } from '@eslint/eslintrc'
import { fixupPluginRules } from '@eslint/compat'
import tsEslint from 'typescript-eslint'

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
  ...tsEslint.configs.recommended,
  {
    rules: {
      'prefer-const': 'error',
      complexity: ['warn', { max: 4 }],
      'no-shadow': 'warn',
      'no-nested-ternary': 'warn',
      '@typescript-eslint/ban-ts-comment': 'off',
    },
  },
  { ignores: ['.next/*', '**/payload-types.ts'] },
  ...patchedConfig,
]

export default config
