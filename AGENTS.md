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

### Camp terms

These are the words conveniat27 uses with its people. Use them in every user-facing German string,
in the CMS labels and in the examples you give, and prefer them over the Cevi.DB role names: an
editor reads "AVP", not "Adressverwalter". Examples name real Höfe, like "Cevi Uster" or "Züri 11",
not invented ones like "Hof Süd".

The member database is **Cevi.DB**, written exactly like that, in every label, help text, button and
message a user or an editor reads. Never "Hitobito", "CeviDB" or "Cevi DB" there. Hitobito is the
software Cevi.DB runs on; keep that name in code, identifiers, logs, spans and comments.

| Begriff                                    | Bedeutung                                                                                                                                                                                                                                                 |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **conveniat27**                            | Lagername, konsequent überall so geschrieben.                                                                                                                                                                                                             |
| **Cevi.DB**                                | Die Mitgliederdatenbank des Cevi, genau so geschrieben. Läuft auf der Software Hitobito, was nur im Code vorkommt.                                                                                                                                        |
| **Abteilung**                              | Eine lokale Cevi-Abteilung, z.B. Abteilung Uster, Abteilung St. Gallen. Je nach Region auch Ortsgruppe genannt; conveniat27 verwendet in seiner Kommunikation ausschliesslich Abteilung.                                                                  |
| **der Cevi**                               | Gemeint ist der Verein, deshalb _der_ Cevi.                                                                                                                                                                                                               |
| **Hof** (Höfe)                             | Kleinste organisatorische und räumliche Einheit von Abteilungen auf dem Platz, aus einer oder mehreren Cevi-Abteilungen.                                                                                                                                  |
| **Quartier** (Quartiere)                   | Nächstgrössere Einheit aus mehreren Höfen. Das Gesamtlager hat 8 Quartiere à ca. 500 Personen; dort laufen alle Blöcke, die nicht auf Stufe Hof geplant und umgesetzt werden.                                                                             |
| **Gesamtlager**                            | Alle regulären Teilnehmenden und Leitenden, über alle Quartiere. Gemeinsame Aktivitäten wie Rollenspiele oder Stadtleben finden auf dieser Stufe statt.                                                                                                   |
| **Abteilungsverantwortliche Person (AVP)** | Hof-Verantwortliche/r: jeder Hof hat eine/n sowie eine Stellvertretung, die den Kontakt zwischen Kernteam und Hof sicherstellen. In der Cevi.DB ist die AVP die Hauptleitung (`Event::Role::Leader`) des Hof-Lagers; so zeigt sie auch das Adressbuch an. |
| **Hof-J+S-Hauptleitung**                   | Jeder Hof ist ein eigenes J+S-Lager und wird von ihr geleitet. Idealerweise dieselbe Person wie die AVP.                                                                                                                                                  |
| **Hofcoach**                               | J+S-Coach eines Hofs: prüft und nimmt das Hofprogramm ab und meldet dem Gesamtcoach, dass es den J+S-Standards entspricht.                                                                                                                                |
| **Kernteam**                               | Das OK des conveniat27; die Leitung jedes Ressorts ist darin vertreten.                                                                                                                                                                                   |
| **Ressortmitglied**                        | Person, die in einem Ressort mitarbeitet.                                                                                                                                                                                                                 |
| **FUSI**                                   | Ressort Fundraising, Sponsoring und Interaction.                                                                                                                                                                                                          |
| **KOMA**                                   | Ressort Kommunikation und Marketing.                                                                                                                                                                                                                      |
| **PROST!**                                 | Ressort Programm (und Story).                                                                                                                                                                                                                             |
| **Hofprogramm (HP)**                       | Programm, das die Höfe organisieren.                                                                                                                                                                                                                      |
| **Ressortprogramm (RP)**                   | Programm, das das Ressort Programm organisiert.                                                                                                                                                                                                           |
| **Externes Programm (EP)**                 | Programm ausserhalb des Lagergeländes, z.B. Tageswanderung, Wald, Ausflüge, Badesee.                                                                                                                                                                      |
| **Events (EVN)**                           | Grossveranstaltungen des ganzen conveniat27: Konzerte, Tagesstart/-schluss, RS, Stadtleben, Schlussabend, Eröffnungs-/Abschlussfeier.                                                                                                                     |
| **Leitendenevent**                         | Anlass, an dem Leitende und Helfende teilnehmen dürfen.                                                                                                                                                                                                   |
| **Helfende/r**                             | Schläft, isst und lebt nicht bei einer Abteilung und steht für die ganze Dauer des Einsatzes als Helfer/in zur Verfügung. Kommt gratis ins Lager und stellt dafür die ganze Zeit als Arbeitszeit zur Verfügung (8 h pro Tag).                             |
| **Schichteinsätze**                        | Helfereinsätze, die Abteilungen mit eigenen Personen für bestimmte Aufgaben und Zeiten während des Lagers übernehmen.                                                                                                                                     |
| **Definitive Anmeldung**                   | Ab Winter 2025/2026 melden sich die Abteilungen definitiv an und melden dabei auch ihre Höfe.                                                                                                                                                             |
| **Teilnahmeprognose**                      | Die Schätzung der Teilnehmenden aus dem Sommer 2025.                                                                                                                                                                                                      |
| **Aufbaulager Infrastruktur**              | 12.07.–23.07.2027, für den Aufbau der allgemeinen Infrastruktur.                                                                                                                                                                                          |
| **Aufbaulager Höfe**                       | 21.07.–23.07.2027, Aufbaulager der Abteilungen.                                                                                                                                                                                                           |
| **Scharniertag (Leitendentag)**            | 03.08.2027, ein Tag für Leitende und Helfende; die Kinder sind nicht mehr auf dem Platz.                                                                                                                                                                  |
| **Abbaulager Höfe**                        | 04.08.–06.08.2027, Abbaulager der Abteilungen, nach dem Scharniertag.                                                                                                                                                                                     |
| **Abbaulager Infrastruktur**               | 03.08.–15.08.2027, für den Abbau der allgemeinen Infrastruktur.                                                                                                                                                                                           |

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

**Leaving a Payload access operation undeclared.** Payload fills in whatever you omit with
`Boolean(user)`, and a user here is every camp participant who has logged in through Cevi.DB, not
an editor. An omitted `create` is a collection any participant can write over the REST API, and it
reads as an intentional blank in the config. Declare all four.

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
`getLocaleFromCookies()`, client components with `useCurrentLocale(i18nConfig)` from
`@/hooks/use-current-locale`.

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
not import each other, with `payload-cms` and `next-auth` open to everyone. The Cevi.DB client lives
in `src/lib/hitobito`, so every feature reaches it without an exception.

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

ESLint cannot tell a client file from a server one, so `no-console` covers all of `src`, and the
browser files that need `console` are listed by name in `eslint.config.mjs`. Add a browser file
there when it needs one. A server file on that list is the same mistake as widening an import
boundary.

No hardcoded user-facing strings. Declare a `StaticTranslationString` and index it by locale. Both
that type and `i18nConfig` come from `@/types/types`.

Style with Tailwind and combine classes with `cn()` from `@/lib/utils`. No template literals for
class names. Icons come from `lucide-react` and nowhere else.

The admin panel looks like Payload, because editors should not have to learn a second design.
Wherever `@payloadcms/ui` has a piece for the job, use it: `Button`, `Pill`, `Banner`, `TextInput`,
`FieldLabel`, `Gutter`, `ShimmerEffect`, `toast`, and its drawers and modals. Colour everything else
with Payload's theme variables, like `text-(--theme-elevation-500)`, so dark mode follows. shadcn/ui
belongs to the public site, not to `/admin`. Before you replace an edit view, try a `ui` field, a tab
or `admin.position: 'sidebar'`. A replaced view loses the document controls, and delete with them.
Tailwind is fine for layout, but a Payload class that is also a Tailwind utility, like `table`,
gets the utility's styles instead.

Components are Server Components until they need state, effects or browser APIs. Keep effect logic
in a named hook instead of inlining `useEffect` in a component.

Declare access on a collection or global for every operation — `read`, `create`, `update` and
`delete`, or `read` and `update` on a global. There is no safe default to fall back on, see above.
Write `() => false` where nothing but the local API should write, and `() => true` where the answer
really is everybody.

Say who with a named rule from `access-rules/roles.ts`, not an inline group check: `isFullAdmin`,
`hasAdminOrWebAccess`, `hasEditorialAccess` for admin, web core team and translation team,
`isEditor` for those three and the program team, `canAccessBilling` for the billing team.
`hasAccessToThisHelper({ requiredRoles })` is for a combination that has no name yet; the second
time you write the same list, name it in `roles.ts` instead. A rule may return a `Where` to narrow
to single documents, which is how `ProgramTeamAccessForGenericPage` lets the program team reach
the pages it was named on.

Every right comes from a role, and a role is held through a Cevi.DB group. `roles.ts` is the only
place that reads the group settings, so a new right is a role or a named set of roles there, never
a group id in a rule and never a second list of groups to keep in sync. Roles add up: a rule must
not require two roles at once, because nobody can then tell from a person's groups what they may
do. `canOpenAdminPanel` decides who gets into `/admin` and grants nothing else.
`/admin/access-overview` renders every Cevi.DB group and any person against the real rules, so
open it after you change one and check the column you meant to change, and no other.

`admin.hidden` is not access control. It keeps an entry out of the sidebar and nothing more, so give
the entry a real rule as well and keep the two saying the same thing.

A browser upload goes straight to the bucket through `createPresignedUploadUrl` from
`@/lib/presigned-urls`, with an `UploadPolicy` naming the allowed types and the largest size. It
signs the type and the size into the URL and picks the object name. ESLint keeps the presigner out
of every other file; a failing `no-restricted-imports` there means the upload needs a policy, not
an exception. Check the object again once it is uploaded, and delete it when you refuse it.

Client components fetch and mutate through tRPC. Do not add new Server Actions. This is about
data flowing to and from the client: server components still read Payload directly, which is what
keeps preview, drafts and content resolution working. The eight files that already use `'use server'`
stay as they are, and Payload admin components are a standing exception where tRPC is not
reachable. Name queries `getThing` and `getThingList`, mutations `createThing`, `updateThing`
and `deleteThing`, and anything else after what it does, like `archiveChat`.

## The app's design language

Every screen of the app speaks one design language. Programm, the detail page of a block and the
Karte are its reference; read them before you build a screen, and copy from them rather than
inventing. The admin panel is not part of it, see above.

Shared styles first. The colours are named by role in `src/app/tailwind.config.ts`: `bg-page`,
`border-line`, `text-heading`, `bg-tint` and `border-tint-line` for soft brand green, `bg-chip`,
`bg-quiet` for neutral grey, and `live` for what is running and for warnings. The pieces live in
`src/components/ui`: `SectionLabel`, `IconTile`, `EmptyState`, `Card`, the `primary`, `quiet` and
`outlined` button variants with the `touch` and `touchIcon` sizes, `BottomSheet`,
`ShareLinkButton` and the `StarButton`. A hex value in a component is a token that does not exist yet; add it to the config
by its role once a second screen needs it, not before.

- **Surfaces.** The page is `bg-page` with no background mark. A card is white, 14px radius,
  `border-line`, without shadow. A soft card is `bg-quiet`. A list is rows divided by a line, not a
  stack of bordered cards. Facts sit in one card, each row behind an `IconTile`.
- **Type.** Headings are Montserrat in `text-heading`, a page title 28px extra bold. Body text is
  Inter at 15px, secondary text `text-green-700`, muted text `text-green-500` and never lighter.
  A section starts with a `SectionLabel`, not with a bold sentence.
- **Colour.** Brand green marks the one primary action of a view, the selected day and the user's
  own Quartier. Orange (`live`) means "now" and nothing else: the line of now, what is running.
  Red is the Notfall tab and screens, and with the `danger` tokens everything that went wrong, is
  blocked or overdue, or destroys something: errors, a full shift, an overdue loan, leaving,
  removing, deleting, the required-field asterisk. A delete that cannot be undone for everyone
  also says what it deletes. A notice that is only good to know is neutral, `bg-quiet` with an
  icon. The favourite star is amber. Each programme category keeps its colour, and one that would
  read as red is shifted to pink. Each Quartier keeps its house colour from its banner, Kitsune's
  dark red included: it is the house's identity, not a warning (`src/components/quartier`).
- **Controls.** Touch targets are at least 44×44px. One `primary` button per view, the rest
  `quiet` or `outlined`; a destructive action is `outlined` in red (`danger`) and either asks before it acts or can
  be undone right after. A segmented control takes its track and segments
  from `src/components/ui/segmented-control.ts`. A text field takes its frame from
  `src/components/ui/field.ts` and a search is `AppSearchBar`: 44px, 12px radius, a search filled
  grey and a form field white with a line, both focused by the same green ring. A field never
  styles its own border, radius or focus. Chips are small and square on
  `bg-chip`, the user's own one filled brand green; pills are round and outlined.
- **Header.** App titles sit on the left, next to the menu. A page puts its buttons on the right
  with `SetHeaderActions`, as 44px icons, instead of adding a bar of its own. The app footer is
  shared by every screen; a change to it is its own pull request.
- **Content before decoration.** Say a fact once: the start time in the timeline's time column,
  not again on the card. Hide a description that only repeats the title. Lead with what concerns
  the user, such as the slot of their own Quartier, and list the rest under it. Show what comes
  next. "Now" is the camp's time, Europe/Zurich, never the phone's timezone.
- **Accessibility.** Every icon-only button has an `aria-label`, a toggle and the chosen segment
  of a segmented control have `aria-pressed`, the current page and day have `aria-current`. Text
  reaches 4.5:1 contrast. Use real buttons and links, never a clickable `div`.
- **Phones.** Lists scroll natively and snap; content follows the finger and is there before it
  is released. A choice or a set of filters that belongs to the page opens in the shared
  `BottomSheet`, over the dimmed page; a menu of actions on one item does not float but expands in
  place. The one floating button is a screen's main action where its list scrolls under it, like
  "Neuer Chat"; nothing else floats over content the user needs, except a map's controls.
- **Desktops.** The same choice may open as a popup under the button that opened it: pass that
  button to the shared `BottomSheet` as its `anchor`, and it is a popup from Tailwind's `xl` up
  and a sheet below. There is one component for both, never a popover or dropdown of its own,
  and nothing floats on a phone.

## Git and pull requests

Branch from `dev`. `dev` is protected too, so everything reaching it goes through a pull request
with `eslint`, `typecheck` and the test suite green — no size of change is small enough to push
straight to it. `typecheck` is Prettier, the Payload artifact check and `tsc` in one job.
`main` is protected the same way, and releases merge `dev` into `main` without squashing.
Do not bump the version in `package.json` yourself. Every merge into `main` accumulates in one
open release pull request that release-please keeps up to date. Its version comes from the commit
titles since the last tag: `feat:` a minor, `fix:`, `perf:` and `chore(deps):` a patch, a `!` or a
`BREAKING CHANGE:` footer a major. Other types release nothing and stay out of the changelog.
Merging that pull request tags the release and builds production. A merge into `main` on its own
builds nothing. The release then opens a pull request that merges `main` back into `dev`, so `dev`
carries the new version and the next release pull request is not out of date with its base. It
auto-merges once the checks are green and only wants you when the merge conflicts.

Write conventional commit titles in plain language, like `fix(chat): unread badge clears on
reopen`.

Never open a pull request unless I asked for one. One concern per pull request. If the description
says "also", split it.

The test workflow runs on every pull request, whatever it is based on, because a required check
that never reports would leave a stacked pull request pending forever. For the same reason a
check is never filtered by path: a pull request that changes only the changelog, the release-please
manifest and the version in `package.json` still starts both workflows, and the `eslint` and test
jobs run, find nothing but a release in the diff and skip their remaining steps.

## Taste

Write the smallest change that makes the behaviour obvious. Complexity belongs in the Payload
converters, the cache handler and the tRPC boundary. Feature code and components stay boring.

Comments say why, and they move when the code moves.

Users run this on cheap phones over camp wifi. Weigh every dependency, animation and round trip
against that.

If a rule here fights the task in front of you, say so and ask. Do not break it quietly.

## Testing the native app against a local instance

The native app ([`cevi/conveniat27-app`](https://github.com/cevi/conveniat27-app)) is a React Native
WebView around `/entrypoint?app-mode=true`; its shell, push bridge and offline retry live in the
private [`cevi/app-core`](https://github.com/cevi/app-core). Anything that behaves differently in
the app (app mode, the user agent, the push bridge, a cold start) can be tested without an Android
SDK on the host: the emulator runs in Docker, the APK is built in Docker, and both the native app
and the installed PWA are driven over adb and the Chrome DevTools protocol. Every step below runs
unattended. Needs Docker, read access to `/dev/kvm`, and `gh` logged in with access to both repos.

**1. Run the webpage.** `pnpm dev` serves `http://localhost:3000` with the fake Cevi.DB login on
`http://localhost:3001`. The service worker is off in development; for offline or cold-start work
use `docker compose --profile service-worker up --build` instead, same ports.

**2. Start the emulator.** The device reaches the host through `adb reverse` and a `socat` in the
container, so it sees the same `http://localhost:3000` and `:3001` as a desktop browser.
`localhost` is a secure context, so the service worker and PWA install work; `10.0.2.2` would not
be one, and inside this container it is not the host anyway.

```bash
docker run -d --name c27-android-emu --device /dev/kvm --add-host=host.docker.internal:host-gateway \
  -p 127.0.0.1:6080:6080 -p 127.0.0.1:5037:15037 -p 127.0.0.1:9222:19222 \
  -e EMULATOR_DEVICE="Samsung Galaxy S10" -e WEB_VNC=true budtmo/docker-android:emulator_14.0
e() { docker exec c27-android-emu "$@"; }
until [ "$(e adb shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" = 1 ]; do sleep 5; done
docker exec -d c27-android-emu socat TCP-LISTEN:15037,fork,reuseaddr TCP:127.0.0.1:5037  # adb server
docker exec -d c27-android-emu socat TCP-LISTEN:19222,fork,reuseaddr TCP:127.0.0.1:9222  # DevTools
for p in 3000 3001; do
  docker exec -d c27-android-emu socat TCP-LISTEN:$p,bind=127.0.0.1,fork,reuseaddr TCP:host.docker.internal:$p
  e adb reverse tcp:$p tcp:$p
done
for k in window_animation_scale transition_animation_scale animator_duration_scale; do
  e adb shell settings put global $k 0
done
```

`http://localhost:6080` shows the screen in a browser (noVNC). Rules learned the hard way:

- One adb server per emulator: the container's. A second server on the host fights it for the
  emulator's adbd until the device goes offline for good. Host tools use the container's server
  with `ADB_SERVER_SOCKET=tcp:127.0.0.1:5037`.
- The image does not survive `docker restart`; the device process exits. Recreate the container.
- Right after a fresh boot Google Play services restarts and Android kills apps that use its font
  provider, ours included (`depends on provider ... in dying proc`). Launch again.
- The image ships Chrome and WebView 113, older than what participants run. Logic bugs reproduce,
  rendering and API support may not.

**3. Build the APK for the local instance.** The app's environments are hard coded in
`Conveniat27App/src/config/appConfig.ts`. Point `testing` at the local instance and allow cleartext
in the `screengrab` build type (bundled JS, debug signed, debuggable, so its WebView is open to
DevTools). Never commit these two edits. `@cevi/app-core` resolves over SSH, so the build rewrites
GitHub URLs to HTTPS with the `gh` token, and it needs Node 22.18 or newer, which the build image
does not ship.

```bash
gh repo clone cevi/conveniat27-app /tmp/c27app -- --depth 1
cd /tmp/c27app/Conveniat27App
sed -i "s#testing: '[^']*'#testing: 'http://localhost:3000/entrypoint?app-mode=true'#" src/config/appConfig.ts
sed -i 's#usesCleartextTraffic: "false"#usesCleartextTraffic: "true"#' android/app/build.gradle
docker run --rm -e GH_TOKEN="$(gh auth token)" -v /tmp/c27app:/work -v c27-gradle-cache:/root/.gradle \
  reactnativecommunity/react-native-android:latest bash -euc '
    git config --global url."https://x-access-token:$GH_TOKEN@github.com/".insteadOf ssh://git@github.com/
    curl -fsSL https://nodejs.org/dist/v22.20.0/node-v22.20.0-linux-x64.tar.gz | tar -xz -C /opt
    export PATH=/opt/node-v22.20.0-linux-x64/bin:$PATH && npm i -g yarn@1.22.22 >/dev/null
    cd /work/Conveniat27App && yarn install --frozen-lockfile && yarn generate:app-info
    cd android && ./gradlew assembleScreengrab -PreactNativeArchitectures=x86_64 --no-daemon'
docker cp android/app/build/outputs/apk/screengrab/app-screengrab.apk c27-android-emu:/tmp/app.apk
docker exec c27-android-emu adb install -r /tmp/app.apk
```

The first build downloads the SDK platform and takes several minutes, later ones two to three with
the Gradle volume.

**4. Launch and attach DevTools.** The deep link `conveniat27://env=testing` switches the app to
the local instance and persists. A WebView's DevTools socket carries the process id, so look it up
after every launch. Only one DevTools client can attach to a WebView at a time.

```bash
PKG=ch.cevi.conveniat27.conveniat27app; e() { docker exec c27-android-emu "$@"; }
e adb shell am force-stop $PKG
e adb shell am start -W -a android.intent.action.VIEW -d conveniat27://env=testing $PKG
PID=$(e adb shell pidof $PKG | tr -d '\r')
e adb forward tcp:9222 localabstract:webview_devtools_remote_$PID
curl -s 127.0.0.1:9222/json/list   # the page should be http://localhost:3000/...
```

For the PWA, open `http://localhost:3000/entrypoint?app-mode=true` in the emulator's Chrome, install
it from the menu, and forward `localabstract:chrome_devtools_remote` instead. Without Play services
Chrome installs a standalone shortcut rather than a WebAPK; it runs through the same worker.

**5. Drive it.** Node 24 has `fetch` and `WebSocket` built in, so a page needs no Playwright:

```js
// /tmp/cdp.mjs — node /tmp/cdp.mjs '<expression>' evaluates in the localhost page behind :9222
const pages = await (await fetch('http://127.0.0.1:9222/json/list')).json();
const page = pages.find((p) => p.type === 'page' && p.url.startsWith('http://localhost:300'));
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve) => (ws.onopen = resolve));
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  if (message.id !== 1) return;
  const { result, exceptionDetails } = message.result;
  console.log(
    JSON.stringify(exceptionDetails ? exceptionDetails.exception?.description : result.value),
  );
  ws.close();
};
ws.send(
  JSON.stringify({
    id: 1,
    method: 'Runtime.evaluate',
    params: { expression: process.argv[2], awaitPromise: true, returnByValue: true },
  }),
);
```

Click by visible text or a selector, and wait for text instead of sleeping. The onboarding speaks
the device's locale, and `innerText` applies `text-transform`, so a section label reads
`SCHNELLZUGRIFF`. The fake login page lists one `button[name=user_id]` per test user: `1` is
"Admin Conveniat v/o Letmein", `3` is "Benutzer Nr. 3 v/o NoAccess" without groups. On Android the
login runs inside the WebView, so after the click the page returns to `localhost:3000` signed in.
Take screenshots with `docker exec c27-android-emu adb exec-out screencap -p > shot.png`.

**6. Bad networks.** The emulator's traffic to the local instance leaves the container as requests
to ports 3000 and 3001, so shape those ports only; filtering by address would also slow adb and
DevTools, whose replies go to the same host.

```bash
docker run -d --rm --name c27-netem --network container:c27-android-emu --cap-add NET_ADMIN \
  nicolaka/netshoot sleep infinity
n() { docker exec c27-netem "$@"; }
n tc qdisc add dev eth0 root handle 1: prio bands 3 priomap 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1
n tc qdisc add dev eth0 parent 1:3 handle 30: netem delay 2000ms 500ms loss 40%
for p in 3000 3001; do n tc filter add dev eth0 parent 1: protocol ip prio 1 u32 match ip dport $p 0xffff flowid 1:3; done
n tc qdisc del dev eth0 root   # back to normal
```

`loss 100%` is Wi-Fi without uplink, the case airplane mode does not reproduce. For a cold start,
`am force-stop` the app first; that also stops its service worker.

**7. Clean up.** `docker rm -f c27-netem c27-android-emu`. Stop only what you started.

**Agent tooling.** The adb-plus-CDP recipe above is what was verified on 2026-10-30. Against this
setup [`mobile-mcp`](https://github.com/mobile-next/mobile-mcp) connected through
`ADB_SERVER_SOCKET` and gave screenshots, coordinate taps and app install, clear and launch, but its
element listing failed on every screen, and
[`chrome-devtools-mcp`](https://github.com/ChromeDevTools/chrome-devtools-mcp) attached to the
WebView socket without listing its page. Prefer stable selectors to coordinates, and put a flow
that has to stay green into a committed test rather than re-exploring it every run.

### With the T3 Code Device panel

T3 Code has a Device panel of its own (`device_list`, `device_open`, the `agent-device` CLI),
switched on per environment under Settings > Integrations > Devices. It drives the AVDs of a device
host's own Android SDK, not the Docker emulator, and the user watches the screen live. Verified on
2026-10-30 through onboarding, the fake login and the dashboard. Use it when the machine has T3 Code
and an Android SDK; keep the Docker emulator for everything else and for bad networks (step 6).

- `device_list` names the hosts; `local` is the machine T3 Code runs on. `device_open` boots the
  AVD and returns an `agent-device` command bound to it. That command runs on the device host and
  talks to a daemon there; the emulator sits under the host's normal adb server, so plain `adb`
  works next to it for installs, forwards and logs.
- `device_open` needs `ffmpeg` with the `libx264` encoder on the host's PATH for the panel's video.
  A static build dropped into `~/.local/bin` is enough, without a restart.
- The webpage can run on another machine. Tunnel it to free ports on the device host and map them
  back to the ports the app expects, so the device still sees `localhost:3000` and `:3001`:
  `ssh -N -L 23000:localhost:3000 -L 23001:localhost:3001 <webpage-host>`, then
  `adb reverse tcp:3000 tcp:23000` and `adb reverse tcp:3001 tcp:23001`. The fake login is reached
  by the server through `HITOBITO_BASE_URL` and by the browser through `HITOBITO_FORWARD_URL`, so
  only the latter has to stay `http://localhost:3001` when the webpage runs on moved ports.
- Build the APK as in step 3, then `agent-device install ch.cevi.conveniat27.conveniat27app <apk>`,
  `adb shell pm clear ch.cevi.conveniat27.conveniat27app` for a fresh onboarding, and
  `agent-device open ch.cevi.conveniat27.conveniat27app conveniat27://env=testing`.
- `agent-device snapshot -i` shows a bare `[webview]` until the page has loaded, then lists its
  buttons and text as `@eN` refs; `press @eN --settle` and `wait text "..."` work on them.
  `find text "..."` without an action taps the match. The fake login's buttons all read `Login`, so
  pick a user through DevTools.
- `agent-device cdp` attaches to a Metro or Hermes runtime, not to a WebView. For DevTools forward
  the WebView socket as in step 4, with the host's `adb` and a free local port if 9222 is taken.
- The push step reports push as blocked until the permission is granted with
  `agent-device settings permission grant notifications` and the app is relaunched with
  `agent-device open <package> --relaunch`. `agent-device back` on the dashboard leaves the app.
- Close the device with `device_close`; remove the `adb reverse` rules and the tunnel you added.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
