# conveniat27

conveniat27 is the website and the app of the conveniat27 camp. One Next.js 16 App Router
deployment serves the public site, the installed PWA, and the Payload CMS admin panel that editors
use to write the content. The same codebase ships a second time as konekta, built from `main` and
dispatched to `cevi/konekta-webpage` by `.github/workflows/konekta-build.yml`, with fewer locales
and a different set of feature flags.

<!-- Cyrill: the section below is my draft of your voice, written from what you have actually
enforced in this repo. Rewrite it in your own words or delete it. Claude Code strips block-level
HTML comments before loading this file, so this note costs no context. -->

## A note from the maintainer

I would rather read a small diff that fixes the cause than a large one that routes around it. If a
bug needs a workaround in three call sites, you have not found it yet.

Do not add an abstraction for a second case that has not arrived. Do not keep complexity because it
is already there. When a CMS-shaped question comes up and the answer changes the data model, ask me
instead of guessing, because editors live with that decision for years and a migration is expensive.

Logging and tracing are part of the product here, not decoration. I have spent real evenings reading
Loki because someone logged at the wrong level.

## Glossary

- **you** is the agent reading this file.
- **editor** is a person writing content at `/admin`. They cannot deploy. They inherit whatever you
  make brittle in the CMS.
- **user** is a camp participant on a phone, often with no signal.
- **deployment** is one built instance, either conveniat27 with all locales or konekta with German
  and French.
- **feature** is a module under `src/features/`.
- **block** is a Payload block, a content unit an editor places on a page, paired with a React
  converter.
- **the stack** is the local Docker Compose environment. Mongo, Postgres, Redis, SeaweedFS, a fake OAuth
  server, and Grafana with Loki, Tempo and Prometheus.

## What has to keep working

Offline. The service worker, the precached shell and the persisted query cache are features, and
`e2e/offline-*.spec.ts` exists because they keep breaking.

Editor control. Pages come from Payload. A change that renders correctly but drops a CMS field is
still wrong.

Three locales. Every string an editor does not own is a `StaticTranslationString` with `de`, `fr`
and `en`. German is the fallback and the prefix-less locale, so a deployment without it cannot
serve a page. See `src/features/payload-cms/payload-cms/locales.ts`.

Two deployments from one tree. Put deployment differences behind a feature flag or an env value,
never behind a hostname check inside a component.

Usable logs. Server code logs through a logger at a level that matches how often the line fires.

## Ways to break things

**Confusing the host and container dependency trees.** A named Docker volume mounts over
`node_modules` inside the `payload` container, so the host tree and the container tree are separate
installs. Installing on the host changes nothing the container runs, and every worktree using the
default Compose project name shares that one volume. When the container is up, run package manager
commands in it with `docker compose exec payload pnpm ...`, which does not depend on the generated
container name.

**Regenerating Payload artifacts in the wrong environment.** CI hashes
`src/features/payload-cms/payload-types.ts` and `src/app/(payload)/admin/importMap.js`, regenerates
both, and fails on any difference. Generate them with the same feature flags and enabled locales CI
uses, and commit the result with your change.

**Pointing destructive commands at a remote database.** `pnpm db:seed` resets. The dev container
runs `prisma db push --accept-data-loss` on boot. Both are local only. The `db:tunnel-*` scripts
open real databases, so read through them and nothing else unless I asked for exactly that.

**Force pushing.** Your feature branches are yours. Coordinate on `dev`. Never on `main`, which is
protected anyway.

**Widening an import boundary to silence ESLint.** A failing `import/no-restricted-paths` means the
code is in the wrong place. Move the shared part. Do not add an exception.

## Environment

Use pnpm. Never npm, yarn or bun. Node 24.

Non-interactive shells do not load NVM, so prepend the Node binary directory before running package
manager or git commands:

```bash
export PATH="$HOME/.nvm/versions/node/v24.11.1/bin:$PATH"
```

`pnpm dev` starts the Compose dependencies and runs Next.js on the host. `docker compose --profile
dev up` runs Payload in a container instead, on port 3000, with Prisma Studio on 51212 and metrics
on 9464. The service worker is off in normal development, so exercise it with `docker compose
--profile service-worker up --watch --build`.

Local configuration comes from `.env`, starting from `.env.example`. The Redis and filesystem cache
handler is disabled in development, where Next.js uses its in-memory cache.

Stop only what you started, and only by a process id you captured yourself.

## Verifying

Run the full suite before you call a task done or write a commit:

```bash
pnpm verify
```

It runs `prettier:check`, `typecheck`, `lint:check` and `test`, in that order. Do not skip it and do
not substitute a narrower check for it. Format with `pnpm prettier`, never `npx prettier` or a
global binary.

Jest covers unit and integration tests. Playwright lives behind `pnpm test:e2e` and is not part of
`verify`, so run it yourself when you touch caching, the service worker, or offline behaviour.

If `pnpm test` fails in files you never opened, check for stale agent worktrees. `jest.config.ts`
ignores `worktrees/` and `.claude/` for that reason.

Test behaviour someone can observe. A test that restates the implementation earns nothing.

## Every surface a change touches

Most defects here are correct on the one path someone tried. Walk this list and say which entries
applied.

**Locales.** All three, in the same commit. Server components read the locale with
`getLocaleFromCookies()`, client components with `useCurrentLocale(i18nConfig)`.

**Both deployments.** konekta serves German and French with its own flags. A change gated on
nothing ships to both.

**The CMS round trip.** Two artifacts with two different triggers. Any schema change to a
collection, global, block or field needs `pnpm generate:types`. Any change to a referenced admin
component needs `pnpm generate:importmap`, or the admin panel cannot resolve it. Run both when you
are unsure, and commit the result. A changed block field also needs a restart of the running Payload
process. Until it restarts, Payload strips the new field from the data the renderer receives, which
looks exactly like a rendering bug and wastes an hour.

**Draft and preview.** Preview bypasses `'use cache'` through the `?preview=true` and
`?preview-token=...` parameters. We do not use `draftMode()`, because its cookie would disable
caching across the admin panel. Drafts also skip field validation, so the renderer sees values the
CMS would have rejected. Handle missing and malformed input.

**Caching.** Page data flows through `'use cache'` helpers and the custom cache handler, with
`cacheComponents: true` in `next.config.ts`. Adding a request-bound read inside a cached path
changes what can be cached. Say so when you do it.

**The client cache.** Browsers restore yesterday's persisted TanStack query blob from IndexedDB
after your deploy. Read new fields defensively or you crash returning users.

**Reverse states.** If you added a way in, add the way out and the way to see it.

**Server against browser.** Server code uses the logger. Browser and service worker code keeps
`console.*` and cannot read `process.env`, because the Serwist build inlines nothing.

## Where code lives

```plaintext
src/
├── app/          # App Router: (frontend), (onboarding), (payload), api
├── features/     # domain modules: chat, billing, map, schedule, payload-cms, and others
├── components/   # shared UI, shadcn/ui and Headless UI
├── hooks/  lib/  types/  utils/  config/  context/  schemas/  trpc/
├── proxy.ts      # Next.js 16 renamed middleware.ts to proxy.ts
└── instrumentation.ts, tracing.ts
```

`eslint.config.mjs` enforces the direction with `import/no-restricted-paths`. `src/app` imports from
`src/features`, and both import from the shared directories. Nothing goes the other way. Features do
not import each other, with `payload-cms` and `next-auth` open to everyone and `billing` allowed
into `registration_process` for the Hitobito client.

## Conventions

camelCase for variables and functions, PascalCase for components and interfaces, UPPER_SNAKE_CASE
for constants. JSDoc on exported functions and classes. ES modules and `fetch`, never `require`.

TypeScript is strict. Annotate parameters and return types. Reach for `unknown` and narrow it rather
than `any`. Import React as a type with `import type React from 'react'`.

Server code never calls `console.log`, `info`, `debug` or `trace`, and ESLint blocks it. Use
`req.payload.logger` when a Payload request is in scope, otherwise `createLogger(name)` from
`@/utils/server-logger`. Anything firing per request, per render or per cache write is `debug`.
`console.error` is not a way to make a debug line reach Loki. Three of them once produced 82% of a
day's error volume and made the error rate meaningless.

No hardcoded user-facing strings. Declare a `StaticTranslationString` and index it by locale. Both
that type and `i18nConfig` come from `@/types/types`.

Style with Tailwind and combine classes with `cn()` from `@/lib/utils`. No template literals for
class names. Icons come from `lucide-react` and nowhere else.

Components are Server Components until they need state, effects or browser APIs. Keep effect logic
in a named hook instead of inlining `useEffect` in a component.

Client components fetch and mutate through tRPC. Do not add new Server Actions. This is about
data flowing to and from the client: server components still read Payload directly, which is what
keeps preview, drafts and content resolution working. The eight files that already use `'use server'`
stay as they are, and Payload admin components are a standing exception where tRPC is not
reachable. Name queries `getThing` and `getThingList`, mutations `createThing`, `updateThing`
and `deleteThing`, and anything else after what it does, like `archiveChat`.

## Git and pull requests

Branch from `dev`. `dev` is protected too, so everything reaching it goes through a pull request
with lint and the test suite green — no size of change is small enough to push straight to it.
`main` is protected the same way, and releases merge `dev` into `main` without squashing.
Do not bump the version in `package.json` yourself. Every merge into `main` accumulates in one
open release pull request that release-please keeps up to date. Its version comes from the commit
titles since the last tag: `feat:` a minor, `fix:`, `perf:` and `chore(deps):` a patch, a `!` or a
`BREAKING CHANGE:` footer a major. Other types release nothing and stay out of the changelog.
Merging that pull request tags the release and builds production. A merge into `main` on its own
builds nothing. Afterwards merge `main` back into `dev`, so `dev` carries the new version.

Write conventional commit titles in plain language, like `fix(chat): unread badge clears on
reopen`.

Never open a pull request unless I asked for one. One concern per pull request. If the description
says "also", split it.

The test workflow runs on every pull request, whatever it is based on, because a required check
that never reports would leave a stacked pull request pending forever.

## Taste

Write the smallest change that makes the behaviour obvious. Complexity belongs in the Payload
converters, the cache handler and the tRPC boundary. Feature code and components stay boring.

Comments say why, and they move when the code moves.

Users run this on cheap phones over camp wifi. Weigh every dependency, animation and round trip
against that.

If a rule here fights the task in front of you, say so and ask. Do not break it quietly.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
