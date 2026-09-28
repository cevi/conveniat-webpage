import type { BrowserContext, Locator, Page, Route } from '@playwright/test';
import { expect, test } from '@playwright/test';

/**
 * A map annotation edited in the CMS has to reach an installed app, and the persisted query cache
 * must not stop it from doing so, neither when a screen opens nor when the user presses "Update"
 * in the offline settings. At the same time a device without a connection, or with one that
 * drops every request, has to keep showing what it downloaded before.
 *
 * Runs against a service-worker build with a real Cevi.DB sign-in through the fake OAuth server.
 * The server keeps answering every tRPC call; only the map annotations (and, where a scenario
 * needs one, the schedule) are replaced by a version the test controls, like an editor changing
 * the annotation between two visits.
 */

const ANNOTATION_ID = 'e2e-offline-refresh-annotation';
const MAP_URL = `/app/map?locationId=${ANNOTATION_ID}`;
const SCHEDULE_ENTRY_TITLE = 'Hofprogramm Cevi Uster: Seilbrücke bauen';

/** Name of the annotation as the editor saved it in the given version. */
const annotationTitle = (version: string): string => `Treffpunkt Cevi Uster ${version}`;

/** The map query trusts its data for 30 minutes (`staleTime` in map-renderer.tsx). */
const MAP_STALE_TIME_MS = 30 * 60 * 1000;
const OLDER_THAN_STALE_TIME_MS = MAP_STALE_TIME_MS + 60 * 1000;

/** Where src/trpc/client.tsx persists the TanStack Query cache. */
const IDB_DATABASE = 'conveniat-db';
const IDB_STORE = 'keyval';
const QUERY_CACHE_KEY = 'conveniat-query-cache-idb';

/**
 * What the app error boundary shows. "Du bist offline" is matched exactly: the offline banner
 * ("Du bist offline. Du siehst den zuletzt geladenen Stand.") is expected and fine.
 */
const ERROR_TEXTS = [
  'Es ist ein Fehler aufgetreten',
  'Du bist offline',
  'Diese Seite konnte nicht geladen werden, da keine Netzwerkverbindung besteht.',
];

interface FakeServer {
  /** Version of the annotation the server currently hands out. */
  mapVersion: string;
  /** Every tRPC request fails at the network level, as on a flaky camp wifi. */
  failTrpc: boolean;
  /** How often the server was asked for the map annotations. */
  mapRequests: number;
  /** How often a map request was attempted while `failTrpc` dropped it. */
  droppedMapRequests: number;
}

const createAnnotation = (version: string): Record<string, unknown> => ({
  id: ANNOTATION_ID,
  title: annotationTitle(version),
  images: [],
  geometry: { coordinates: [8.301_211, 46.502_822] },
  icon: 'MapPin',
  color: '#47564c',
  importance: 'high',
  enableSupportChat: false,
  hiddenOnDefaultMap: false,
  showLabel: true,
});

const createScheduleEntry = (): Record<string, unknown> => ({
  id: 'e2e-offline-refresh-entry',
  title: SCHEDULE_ENTRY_TITLE,
  description: {
    root: { type: 'root', children: [], direction: 'ltr', format: '', indent: 0, version: 1 },
  },
  timeslot: { date: '2027-07-26', time: '14:00' },
  enable_enrolment: false,
  organiser: [],
});

interface TrpcBatchEntry {
  result?: { data?: { json?: unknown } };
  error?: unknown;
}

const patchMapAnswer = (entry: TrpcBatchEntry | undefined, version: string): TrpcBatchEntry => {
  const real = entry?.result?.data?.json as
    | { campMapAnnotationPoints?: { id: string }[]; campMapAnnotationPolygons?: unknown[] }
    | undefined;
  const otherPoints = (real?.campMapAnnotationPoints ?? []).filter((p) => p.id !== ANNOTATION_ID);
  return {
    result: {
      data: {
        json: {
          campMapAnnotationPoints: [...otherPoints, createAnnotation(version)],
          campMapAnnotationPolygons: real?.campMapAnnotationPolygons ?? [],
          schedules: { [ANNOTATION_ID]: [] },
        },
      },
    },
  };
};

/**
 * Lets the real server answer every tRPC batch and swaps in the test's version of the map
 * annotations and the schedule. Routed on the context, so requests the service worker forwards
 * are caught as well.
 */
const installFakeServer = async (context: BrowserContext): Promise<FakeServer> => {
  const server: FakeServer = {
    mapVersion: 'v1',
    failTrpc: false,
    mapRequests: 0,
    droppedMapRequests: 0,
  };

  await context.route('**/api/trpc/**', async (route: Route) => {
    if (server.failTrpc) {
      if (route.request().url().includes('map.getMapAnnotations')) server.droppedMapRequests += 1;
      await route.abort('internetdisconnected');
      return;
    }

    const url = new URL(route.request().url());
    const procedures = decodeURIComponent(url.pathname.slice('/api/trpc/'.length)).split(',');
    const touchesMap = procedures.includes('map.getMapAnnotations');
    const touchesSchedule = procedures.includes('schedule.getScheduleEntries');
    if (!touchesMap && !touchesSchedule) {
      await route.fallback();
      return;
    }

    const response = await route.fetch();
    let body: TrpcBatchEntry[];
    try {
      body = (await response.json()) as TrpcBatchEntry[];
    } catch {
      await route.fulfill({ response });
      return;
    }

    const version = server.mapVersion;
    const patched = procedures.map((procedure, index) => {
      if (procedure === 'map.getMapAnnotations') {
        server.mapRequests += 1;
        return patchMapAnswer(body[index], version);
      }
      if (procedure === 'schedule.getScheduleEntries') {
        return { result: { data: { json: [createScheduleEntry()] } } };
      }
      return body[index] ?? { result: { data: {} } };
    });

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(patched),
    });
  });

  return server;
};

/** One pass through the fake Cevi.DB OAuth login; true once a session exists. */
const attemptSignIn = async (context: BrowserContext): Promise<boolean> => {
  const { request } = context;
  const csrfResponse = await request.get('/api/auth/csrf');
  const csrf = (await csrfResponse.json()) as { csrfToken: string };

  const start = await request.post('/api/auth/signin/cevi-db', {
    form: { csrfToken: csrf.csrfToken, callbackUrl: '/app/dashboard' },
    maxRedirects: 0,
  });
  const authorizeUrl = new URL(start.headers()['location'] ?? '');
  const callbackUrl = authorizeUrl.searchParams.get('redirect_uri');
  expect(callbackUrl, 'the sign-in should redirect to the Cevi.DB login').toBeTruthy();

  // what the fake login page does when a user is picked
  await request.get(`${callbackUrl}?code=fake-auth-code-3`, { maxRedirects: 0 });

  const sessionResponse = await request.get('/api/auth/session');
  const session = (await sessionResponse.json()) as { user?: unknown } | null;
  return Boolean(session?.user);
};

/**
 * Signs in through the fake Cevi.DB OAuth server, the way a camp participant does.
 *
 * On a freshly reset stack, two workers signing in the same new user at the same moment race on
 * creating that user and one callback fails (CallbackRouteError). That is setup, not what these
 * tests are about, so it is tried again.
 */
const signIn = async (context: BrowserContext): Promise<void> => {
  let signedIn = false;
  for (let attempt = 0; attempt < 3 && !signedIn; attempt += 1) {
    signedIn = await attemptSignIn(context);
  }
  expect(signedIn, 'the Cevi.DB sign-in should leave a session').toBe(true);
};

interface PersistedMapQuery {
  titles: string[];
  dataUpdatedAt: number;
}

/** The German map annotations in the persisted query cache, as the next start restores them. */
const readPersistedMap = (page: Page): Promise<PersistedMapQuery | undefined> =>
  page.evaluate(
    async ({ database, store, key, annotationId }) => {
      // an empty string stands for "nothing persisted yet"
      const raw = await new Promise<string>((resolve) => {
        const open = indexedDB.open(database);
        open.addEventListener('error', () => resolve(''));
        open.addEventListener('success', () => {
          const db = open.result;
          if (!db.objectStoreNames.contains(store)) {
            db.close();
            resolve('');
            return;
          }
          const get = db.transaction(store, 'readonly').objectStore(store).get(key);
          get.addEventListener('success', () => {
            db.close();
            resolve((get.result as string | undefined) ?? '');
          });
          get.addEventListener('error', () => {
            db.close();
            resolve('');
          });
        });
      });
      if (raw === '') return;

      interface Query {
        queryKey: [string[], { input?: { locale?: string } }?];
        state: {
          dataUpdatedAt: number;
          data?: { campMapAnnotationPoints?: { id: string; title: string }[] };
        };
      }
      const blob = JSON.parse(raw) as { json: { clientState: { queries: Query[] } } };
      const query = blob.json.clientState.queries.find(
        (q) =>
          q.queryKey[0].join('.') === 'map.getMapAnnotations' &&
          q.queryKey[1]?.input?.locale === 'de',
      );
      if (query === undefined) return;
      return {
        titles: (query.state.data?.campMapAnnotationPoints ?? [])
          .filter((point) => point.id === annotationId)
          .map((point) => point.title),
        dataUpdatedAt: query.state.dataUpdatedAt,
      };
    },
    { database: IDB_DATABASE, store: IDB_STORE, key: QUERY_CACHE_KEY, annotationId: ANNOTATION_ID },
  );

const persistedMapTitle = async (page: Page): Promise<string | undefined> => {
  const persisted = await readPersistedMap(page);
  return persisted?.titles[0];
};

/**
 * Moves every persisted query back in time, as if the app had last been open half an hour ago.
 * Runs on a page outside the app, so no mounted query client writes the blob back meanwhile.
 */
const agePersistedCache = async (page: Page, byMs: number): Promise<void> => {
  await page.goto('/api/auth/csrf');
  await page.evaluate(
    async ({ database, store, key, by }) => {
      await new Promise<void>((resolve, reject) => {
        const open = indexedDB.open(database);
        open.addEventListener('error', () => reject(new Error('cannot open the query cache')));
        open.addEventListener('success', () => {
          const db = open.result;
          const transaction = db.transaction(store, 'readwrite');
          const objectStore = transaction.objectStore(store);
          const get = objectStore.get(key);
          get.addEventListener('success', () => {
            const blob = JSON.parse(get.result as string) as {
              json: { clientState: { queries: { state: { dataUpdatedAt: number } }[] } };
            };
            for (const query of blob.json.clientState.queries) {
              if (query.state.dataUpdatedAt > 0) query.state.dataUpdatedAt -= by;
            }
            objectStore.put(JSON.stringify(blob), key);
          });
          transaction.addEventListener('complete', () => {
            db.close();
            resolve();
          });
          transaction.addEventListener('error', () => reject(new Error('cannot age the cache')));
        });
      });
    },
    { database: IDB_DATABASE, store: IDB_STORE, key: QUERY_CACHE_KEY, by: byMs },
  );
};

const annotationHeading = (page: Page, version: string): Locator =>
  page.getByRole('heading', { name: annotationTitle(version), exact: true });

/** Opens the map on the test annotation and waits until its drawer shows the given version. */
const openMapShowing = async (page: Page, version: string, timeout = 20_000): Promise<void> => {
  await page.goto(MAP_URL);
  await expect(annotationHeading(page, version)).toBeVisible({ timeout });
};

const expectNoErrorScreen = async (page: Page): Promise<void> => {
  for (const text of ERROR_TEXTS) {
    await expect(page.getByText(text, { exact: true })).toHaveCount(0);
  }
};

const expectNoMapSpinner = async (page: Page): Promise<void> => {
  await expect(page.locator('div.animate-spin.rounded-full')).toHaveCount(0, { timeout: 15_000 });
};

/** Waits until the service worker controls the page, so offline navigations have a server. */
const waitForServiceWorker = async (page: Page): Promise<void> => {
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null, undefined, {
    timeout: 30_000,
  });
};

const offlineRow = (page: Page): Locator =>
  page
    .locator('div.space-y-4')
    .filter({ has: page.getByText('Offline-Modus', { exact: true }) })
    .last();

const updateButton = (page: Page): Locator =>
  offlineRow(page).getByRole('button', { name: 'Aktualisieren' });

/** Turns on the offline content in the settings and waits until the download reports done. */
const enableOfflineContent = async (page: Page): Promise<void> => {
  await page.goto('/app/settings');
  await waitForServiceWorker(page);
  const row = offlineRow(page);
  await expect(row).toBeVisible({ timeout: 20_000 });
  const toggle = row.getByRole('switch');
  if ((await toggle.getAttribute('aria-checked')) !== 'true') {
    await toggle.click();
  }
  await expect(row.getByText('Heruntergeladen')).toBeVisible({ timeout: 90_000 });
  await expect(updateButton(page)).toBeVisible({ timeout: 90_000 });
};

/** Presses "Update" and waits for the download to finish, however long that may be. */
const pressUpdateAndWait = async (page: Page, timeout: number): Promise<number> => {
  const button = updateButton(page);
  await expect(button).toBeVisible({ timeout: 20_000 });

  // A download can finish faster than an assertion polls, so remember whether the progress
  // ("Lädt...") was ever on screen instead of trying to catch it there.
  await page.evaluate(() => {
    const state = globalThis as unknown as { sawDownloadProgress?: boolean };
    state.sawDownloadProgress = false;
    const observer = new MutationObserver(() => {
      if ((document.body.textContent ?? '').includes('Lädt...')) {
        state.sawDownloadProgress = true;
        observer.disconnect();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  });

  const startedAt = Date.now();
  await button.click();
  await expect
    .poll(() =>
      page.evaluate(
        () => (globalThis as unknown as { sawDownloadProgress?: boolean }).sawDownloadProgress,
      ),
    )
    .toBe(true);
  // the button makes way for the progress bar while the download runs, and comes back after it
  await expect(button).toBeVisible({ timeout });
  await expect(offlineRow(page).getByText('Lädt...')).toHaveCount(0);
  await expect(offlineRow(page).getByText('Heruntergeladen')).toBeVisible();
  return Date.now() - startedAt;
};

test.describe('Map annotations edited in the CMS reach an installed app', () => {
  test.describe.configure({ timeout: 180_000 });

  test('A: online, a map opened after half an hour shows the edited annotation', async ({
    page,
    context,
  }) => {
    const server = await installFakeServer(context);
    await signIn(context);

    await openMapShowing(page, 'v1');
    await expect
      .poll(() => persistedMapTitle(page), { timeout: 15_000 })
      .toBe(annotationTitle('v1'));

    // an editor renames the annotation; the app is opened again half an hour later
    server.mapVersion = 'v2';
    await agePersistedCache(page, OLDER_THAN_STALE_TIME_MS);
    const requestsBeforeReopen = server.mapRequests;

    await page.goto(MAP_URL);

    await expect(annotationHeading(page, 'v2')).toBeVisible({ timeout: 20_000 });
    await expect(annotationHeading(page, 'v1')).toHaveCount(0);
    expect(server.mapRequests).toBeGreaterThan(requestsBeforeReopen);
    // and it is what the next start restores
    await expect
      .poll(() => persistedMapTitle(page), { timeout: 15_000 })
      .toBe(annotationTitle('v2'));
  });

  test('A2: online, a map opened within half an hour does not ask the server again', async ({
    page,
    context,
  }) => {
    const server = await installFakeServer(context);
    await signIn(context);

    await openMapShowing(page, 'v1');
    await expect
      .poll(() => persistedMapTitle(page), { timeout: 15_000 })
      .toBe(annotationTitle('v1'));

    server.mapVersion = 'v2';
    await page.goto('/api/auth/csrf');
    const requestsBeforeReopen = server.mapRequests;
    await openMapShowing(page, 'v1');
    // give a refetch every chance to land before judging that there was none
    await page.waitForTimeout(3000);

    await expect(annotationHeading(page, 'v1')).toBeVisible();
    expect(server.mapRequests).toBe(requestsBeforeReopen);
  });

  test('B: offline, the map shows the annotations it last had', async ({ page, context }) => {
    const server = await installFakeServer(context);
    await signIn(context);
    await enableOfflineContent(page);

    await openMapShowing(page, 'v1');
    await expect
      .poll(() => persistedMapTitle(page), { timeout: 15_000 })
      .toBe(annotationTitle('v1'));
    server.mapVersion = 'v2';
    await agePersistedCache(page, OLDER_THAN_STALE_TIME_MS);
    await page.goto(MAP_URL, { waitUntil: 'networkidle' });
    // whichever version this build ends up with online is what it has to show offline; give a
    // refetch time to land and the persister (throttled to a second) time to write it
    await page.waitForTimeout(3000);
    const lastShown =
      (await page.locator('h2', { hasText: 'Treffpunkt Cevi Uster' }).textContent()) ?? '';
    await expect.poll(() => persistedMapTitle(page), { timeout: 15_000 }).toBe(lastShown);
    test.info().annotations.push({ type: 'shown before going offline', description: lastShown });

    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    server.mapVersion = 'v3';
    await context.setOffline(true);
    const requestsWhileOffline = server.mapRequests;

    await page.goto(MAP_URL, { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { name: lastShown, exact: true })).toBeVisible({
      timeout: 20_000,
    });
    await expectNoMapSpinner(page);
    await page.waitForTimeout(5000);
    await expect(page.getByRole('heading', { name: lastShown, exact: true })).toBeVisible();
    await expectNoErrorScreen(page);
    expect(pageErrors).toEqual([]);
    expect(server.mapRequests).toBe(requestsWhileOffline);
  });

  test('C: "Update" in the settings downloads the edited annotation', async ({ page, context }) => {
    const server = await installFakeServer(context);
    await signIn(context);
    server.mapVersion = 'v2';
    await enableOfflineContent(page);
    await openMapShowing(page, 'v2');
    await expect
      .poll(() => persistedMapTitle(page), { timeout: 15_000 })
      .toBe(annotationTitle('v2'));

    // the editor changes the annotation again
    server.mapVersion = 'v3';

    await page.goto('/app/settings');
    await waitForServiceWorker(page);
    const updateMs = await pressUpdateAndWait(page, 90_000);
    test.info().annotations.push({ type: 'update online took', description: `${updateMs} ms` });

    // what is on the device now, read where nothing can fetch it again
    await expect
      .poll(() => persistedMapTitle(page), { timeout: 15_000 })
      .toBe(annotationTitle('v3'));
    // Leave the settings page before the connection drops: a settings page that goes offline
    // right after a download sometimes reloads itself (a same-URL navigation Chrome reports as
    // "reload") and that reload cancels the navigation to the map. It happens on this page
    // regardless of the query cache, and it is not what this test is about.
    await page.goto('/api/auth/csrf');
    await context.setOffline(true);
    await page.goto(MAP_URL, { waitUntil: 'domcontentloaded' });
    await expect(annotationHeading(page, 'v3')).toBeVisible({ timeout: 20_000 });
  });

  test('C2: "Update" pressed offline finishes and keeps what was downloaded', async ({
    page,
    context,
  }) => {
    const server = await installFakeServer(context);
    await signIn(context);
    server.mapVersion = 'v2';
    await enableOfflineContent(page);
    await openMapShowing(page, 'v2');
    await expect
      .poll(() => persistedMapTitle(page), { timeout: 15_000 })
      .toBe(annotationTitle('v2'));

    server.mapVersion = 'v3';
    await page.goto('/app/settings');
    await waitForServiceWorker(page);
    await context.setOffline(true);

    const updateMs = await pressUpdateAndWait(page, 30_000);
    test.info().annotations.push({ type: 'update offline took', description: `${updateMs} ms` });

    await expect.poll(() => persistedMapTitle(page), { timeout: 5000 }).toBe(annotationTitle('v2'));
    await page.goto(MAP_URL, { waitUntil: 'domcontentloaded' });
    await expect(annotationHeading(page, 'v2')).toBeVisible({ timeout: 20_000 });
    await expectNoErrorScreen(page);
  });

  test('D: on a connection that drops every request, map and schedule keep their content', async ({
    page,
    context,
  }) => {
    const server = await installFakeServer(context);
    await signIn(context);

    await openMapShowing(page, 'v1');
    await expect
      .poll(() => persistedMapTitle(page), { timeout: 15_000 })
      .toBe(annotationTitle('v1'));
    await page.goto('/app/schedule');
    await expect(page.getByText(SCHEDULE_ENTRY_TITLE)).toBeVisible({ timeout: 20_000 });
    // the persister writes at most once a second
    await page.waitForTimeout(2000);
    await expect
      .poll(() => persistedMapTitle(page), { timeout: 15_000 })
      .toBe(annotationTitle('v1'));

    await agePersistedCache(page, OLDER_THAN_STALE_TIME_MS);
    server.failTrpc = true;
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));

    const mapStart = Date.now();
    await page.goto(MAP_URL, { waitUntil: 'domcontentloaded' });
    await expect(annotationHeading(page, 'v1')).toBeVisible({ timeout: 15_000 });
    await expectNoMapSpinner(page);
    const mapShownAfterMs = Date.now() - mapStart;
    // TanStack retries three times with backoff (1 s, 2 s, 4 s); outlast that before judging
    await page.waitForTimeout(10_000);
    await expect(annotationHeading(page, 'v1')).toBeVisible();
    await expectNoErrorScreen(page);

    await page.goto('/app/schedule', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(SCHEDULE_ENTRY_TITLE)).toBeVisible({ timeout: 15_000 });
    await page.waitForTimeout(10_000);
    await expect(page.getByText(SCHEDULE_ENTRY_TITLE)).toBeVisible();
    await expectNoErrorScreen(page);

    expect(pageErrors).toEqual([]);
    expect(mapShownAfterMs).toBeLessThan(15_000);
    // a build that revalidates tries (and fails) to reach the server here; one that trusts the
    // restored data does not try at all. Both have to keep showing it.
    test.info().annotations.push({
      type: 'map requests dropped',
      description: String(server.droppedMapRequests),
    });
  });
});
