import type { Config } from 'jest';

const config: Config = {
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageProvider: 'v8',
  testEnvironment: 'node',

  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    // maplibre-gl 6 ships ESM only and its `exports` map has no `require` condition, which
    // Jest's CommonJS resolver needs. Point it at the ESM entry directly.
    '^maplibre-gl$': '<rootDir>/node_modules/maplibre-gl/dist/maplibre-gl.mjs',
  },

  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],

  transform: {
    '^.+\\.(t|j)sx?$': [
      '@swc/jest',
      {
        jsc: {
          transform: {
            react: {
              runtime: 'automatic',
            },
          },
        },
      },
    ],
  },

  // `fractional-indexing` (pulled in by @tanstack/db) ships untranspiled ESM
  transformIgnorePatterns: [String.raw`/node_modules/(?!(\.pnpm|@t3-oss|fractional-indexing)/)`],

  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/.next/',
    '<rootDir>/e2e/',
    '<rootDir>/worktrees/',
    // Agent worktrees live here. They are full checkouts, so without this a plain
    // `pnpm test` runs every stale copy of the suite - playwright specs included -
    // and reports failures that belong to code the working tree does not contain.
    '<rootDir>/.claude/',
  ],
};

export default config;
