# instant-nav rig: conveniat27

- BUILD: a production `next build` + `serwist build`, then `next start -p 3720`, in a copy of the
  worktree. The copy is needed when the dev stack bind-mounts the worktree: its `.next` is the
  container's volume (root-owned, empty on the host) and a build would also write `public/sw.js`
  and the maplibre worker under the running dev server. Mirror with
  `rsync -a --delete --exclude=/node_modules --exclude=/.next --exclude=/.git <worktree>/ <copy>/`
  (copy `node_modules` once with `cp -a --reflink=auto`), then in the copy:
  `node_modules/.bin/esbuild src/cache-handlers/default.ts ...` (the `build:cache` script's
  arguments), `NODE_OPTIONS=--no-deprecation node_modules/.bin/next build`,
  `node_modules/.bin/serwist build --config serwist.config.js`. Call the binaries, not
  `pnpm <script>`. `next start` warns about `output: standalone` and works.
- EXPOSE: `EXPOSE_TESTING_API=1` while running `next build` turns on
  `experimental.exposeTestingApiInProductionBuild` (next.config.ts). Nothing else sets it: not the
  Dockerfile, not the konekta build, not CI.
- RUN: `BASE_URL=http://localhost:3720 node_modules/.bin/playwright test e2e/instant-app-navigation.spec.ts --project=chromium --workers=1`.
  `BASE_URL` sets `baseURL` and the `webServer` URL in playwright.config.ts, so Playwright reuses
  the running rig server instead of starting `pnpm start`.
- TEST USER: fake Cevi.DB OAuth user 3 ("Benutzer Nr. 3 v/o NoAccess", no groups), signed in
  through `/api/auth/signin/cevi-db` and `?code=fake-auth-code-3` on the callback; app mode via the
  `design-mode=design-mode-app` cookie; locale de; 390×844 viewport; service workers blocked, so
  the router's prefetching is measured and not the service worker's copies. State: the dev stack's
  data, in which user 3 is in one group chat with messages and has a Quartier with a programme.
- DRIFT: the tests read the chat, the block and its place from the list they click in, so they
  follow the data, but they need user 3 to have at least one chat with a message and a day with a
  block that has a place. An empty stack makes them fail before the lock. Under the lock every
  `fetch` of the page waits, tRPC included, so a page shows only what the router prefetched and
  what the persisted query cache holds; the map's tiles draw after the release.
- CONTRACTS:
  - Tab bar (`nav a[href]`, `prefetch={true}`, viewport): Chats, Notfall, Karte and Programm from
    `/app/dashboard`, Home from `/app/schedule`. Ready on the first tap: the page itself (its
    title, the Alarmieren slider, the map search, the day strip, the greeting); its data once
    loaded. Coming back: the data too (chat rows, cards or the empty state, the entries,
    Schnellzugriff), no skeleton.
  - Programm list → block (`/app/schedule?date=…&id=…`, a card link in `schedule-row.tsx`, default
    prefetch): opens on the same page through `history.pushState`, no server request. Ready: title,
    time, place, the map's frame. Back (the floating back button) shows the list at once.
  - Chats list → chat (`/app/chat/<chatId>`, the row link in `chat-preview.tsx`, default prefetch,
    the App Shell shared by every chat): ready for a chat opened before: its name in the header and
    its recent messages. A chat never opened shows the conversation's own skeleton until its
    messages arrive (the row prefetches them on hover).
- LOOP: local. rsync → build (about 4 min) → stop the previous rig server by its process group
  → `next start -p 3720` in a new process group → run → edit → repeat. Differential: apply the
  optimization's diff in reverse in the copy only (`patch -p1 -R`), build and run; both
  optimization contracts go red, the tab contracts stay green.
- LIVENESS: n/a; local build and start.
- WALLS:
  - The server reads the running dev stack through its published ports:
    `DATABASE_URI=mongodb://localhost:27417/conveniat`,
    `CHAT_DATABASE_URL=postgres://…@localhost:5832/conveniat27`, `REDIS_URL=redis://localhost:6779/7`
    (its own Redis database, so the cache handler does not write into the stack's),
    `HITOBITO_BASE_URL=http://localhost:3401`, `S3_HOST=http://localhost:9400`, and
    `APP_HOST_URL`/`NEXTAUTH_URL`/`NEXT_PUBLIC_APP_HOST_URL=http://localhost:3720` at build and
    start. `FEATURE_ENABLE_WORKFLOWS=false` keeps this server's job runner from draining the
    stack's queues. Never seed or reset.
  - `src/lib/prisma` comes from the dev container (root-owned); `prisma generate` on the host
    cannot overwrite it, and is not needed while it is current.
  - On the first run right after a new build, a tab's first tap under the lock has three times
    not committed at all (the URL never changed: the Programm and Home tabs). A restart or an
    emptied Redis database did not bring it back; later runs passed 96 of 96. Run the suite once
    against a new build before reading a red tab test.
  - The offline specs (`e2e/offline-*.spec.ts`, chromium) are 12–13 red on this branch with or
    without these changes; compare the list of failures, not the count.
