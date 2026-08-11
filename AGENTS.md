# AGENTS.md — AI Agent Operating Instructions & Repository Rules

This document serves as the authoritative guide for all AI coding agents (Google Antigravity, Cursor, Claude Code, GitHub Copilot, Windsurf, etc.) working on the `conveniat27` codebase.

---

## 1. Environment & Package Manager Requirements

- **Package Manager**: Always use `pnpm`. Do NOT use `npm`, `yarn`, or `bun`.
- **Node.js Runtime**: Requires Node 24 (`v24.x`).
- **Environment Pathing**: Because background/non-interactive shells may not load user `.zshrc`/NVM initializations automatically, prepend the Node 24 binary path when executing terminal commands:
  ```bash
  export PATH="$HOME/.nvm/versions/node/v24.11.1/bin:$PATH"
  ```

---

## 2. Mandatory Guardrails & Verification Workflow

### 🚨 Mandatory Verification Rule

Before declaring ANY coding task complete or creating a commit, AI agents **MUST** execute the full verification suite and ensure all checks pass cleanly:

```bash
pnpm verify
```

`pnpm verify` executes:

1. `pnpm prettier:check` — Validates formatting across the codebase.
2. `pnpm typecheck` — Runs `tsc --noemit` to check for TypeScript errors.
3. `pnpm lint:check` — Runs ESLint Flat Config checks, including module boundary validation.
4. `pnpm test` — Executes the Jest unit and integration test suite.

### Formatting Rule

- Use `pnpm prettier` to format files (never run `npx prettier` or global formatters).

---

## 3. Payload CMS Schema Generation

When adding or modifying Payload CMS collections, blocks, or fields inside `src/features/payload-cms/`:

1. Run `pnpm generate:types` to update TypeScript interfaces.
2. Run `pnpm generate:importmap` to update Payload admin import maps.
3. Verify that changes to `src/features/payload-cms/payload-types.ts` and `src/app/(payload)/admin/importMap.js` are committed alongside your changes.

---

## 4. Architecture & Module Boundaries

The codebase follows a strict **Feature-Based Modular Architecture**:

```
src/
├── app/               # Next.js App Router pages and API routes
├── features/          # Encapsulated domain feature modules
│   ├── billing/
│   ├── chat/
│   ├── payload-cms/
│   └── ...
├── components/        # Shared UI components (shadcn/ui, headlessui)
└── lib/               # Global utilities (cn, env, etc.)
```

### Import Rules (Enforced by ESLint)

- **Unidirectional Imports**: `src/app/*` $\rightarrow$ `src/features/*` $\rightarrow$ `src/shared/*` / `src/components/*`.
- **No Cross-Feature Imports**: Code inside `src/features/feature-a/` **cannot** import directly from `src/features/feature-b/`. Shared logic must be moved to `src/shared/` or common modules.
- **No Reverse Imports**: Code inside `src/features/` **cannot** import from `src/app/`.

---

## 5. Logging

Server-side code logs through a logger, never `console.log` / `info` / `debug` / `trace` (ESLint enforces this):

- **`req.payload.logger`** where a Payload request is in scope.
- **`createLogger(name)` from `@/utils/server-logger`** everywhere else on the server.

Both reach Loki with trace correlation and real levels; plain `console.log` reaches neither. Anything that fires
per request, per render or per cache write belongs at `debug`. Browser and service-worker code keeps `console.*`.
See the Logging section of [.github/copilot-instructions.md](file:///.github/copilot-instructions.md).

---

## 6. Detailed Coding Standards

For complete architectural conventions, component guidelines, Tailwind usage (`cn()`), static i18n rules, and custom hook requirements, consult [.github/copilot-instructions.md](file:///.github/copilot-instructions.md).
