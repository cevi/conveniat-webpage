import { deploymentId, SERVER_DEPLOYMENT_ID_HEADER } from '@/config/deployment-id';
import { ServiceWorkerMessages } from '@/utils/service-worker-messages';
import type { SerwistPlugin } from 'serwist';

declare const self: ServiceWorkerGlobalScope;

/**
 * Notices when a page of an older build stays in use after a release, the two steps of a page
 * that stops navigating (5 Nov 2026, an iPad on v1.50.0 after v1.51.0 went live), reports them to
 * PostHog and tells the pages which build the server runs:
 *
 * 1. `stale_build_page_served`: the network was slow, so the worker served its cached copy of a
 *    page, and the network's late answer for the same page came from another build. The page on
 *    screen runs code the server no longer has.
 * 2. `deployment_skew_refused`: such a page asked for a page and the proxy turned it away with a
 *    409 (`@/proxy/deployment-skew-proxy`). The router should load the page the classic way then,
 *    but for a route it already knows it commits a client-side navigation first and, on some
 *    routes, never follows up with the page load.
 *
 * Neither shows up anywhere else: the cached copy never reaches the server, and a refused request
 * ends in the proxy before a trace is written. A page that learns it is outdated makes its next
 * navigation a full page load, see `useFullLoadAfterRelease`; a cached page whose bundle predates
 * that hook is reloaded instead.
 */

/** Clients that already reported a refusal, so a page firing a dozen prefetches reports once. */
const refusedClients = new Set<string>();

/**
 * The build the server last answered with, where it differed from a page's. Kept in memory only:
 * a release installs a new worker, which starts without it.
 */
let serverBuild: string | undefined;

/** The build a page was rendered by, from the `data-dpl-id` Next.js puts on `<html>`. */
async function documentBuild(response: Response): Promise<string | undefined> {
  try {
    const html = await response.text();
    return /<html[^>]*\sdata-dpl-id="([\w-]+)"/.exec(html)?.[1];
  } catch {
    return undefined;
  }
}

async function capture(
  clientId: string,
  event: string,
  properties: Record<string, unknown>,
): Promise<void> {
  if (clientId === '') return;
  try {
    const client = await self.clients.get(clientId);
    client?.postMessage({
      type: ServiceWorkerMessages.CAPTURE_POSTHOG_EVENT,
      payload: { event, properties },
    });
  } catch (error) {
    console.warn(`[SW] Could not report ${event} to PostHog`, error);
  }
}

/**
 * The build the server runs, as far as this worker knows. Without an answer that said otherwise,
 * that is the worker's own build: a worker is what the browser last fetched from the server, so a
 * page of another build is one of an earlier release, such as a cached copy. Not while the next
 * worker installs or waits, which a release brings: the server runs a newer build then, and a
 * page loaded from it in the meantime is newer than this worker.
 */
function knownServerBuild(): string | undefined {
  if (serverBuild !== undefined) return serverBuild;
  const registration = self.registration;
  if (registration.installing !== null || registration.waiting !== null) return undefined;
  return deploymentId;
}

/**
 * Tells one page, or every open page, which build the server runs; each compares it with its own.
 * The worker tells them all when it takes over from the previous one and when an answer shows a
 * build it did not know; a page that starts later asks.
 *
 * @param client the page that asked, or undefined for all of them
 */
export async function reportBuildStatus(client?: Client): Promise<void> {
  const build = knownServerBuild();
  if (build === undefined) return;
  const message = { type: ServiceWorkerMessages.BUILD_STATUS, payload: { serverBuild: build } };
  try {
    const pages = client ? [client] : await self.clients.matchAll({ type: 'window' });
    for (const page of pages) page.postMessage(message);
  } catch (error) {
    console.warn('[SW] Could not report the server build to the pages', error);
  }
}

/**
 * Pages whose bundle asked for the server build, so they load their next page fully themselves.
 * A page of a build from before `useFullLoadAfterRelease` never asks and ignores the message.
 */
const listeningPages = new Set<string>();
const waitingForPage = new Map<string, () => void>();

/**
 * How long a page the worker served from its cache has to ask before the worker takes it for one
 * without `useFullLoadAfterRelease`. The page asks once it has hydrated, which on a cheap phone
 * starting over camp wifi takes a few seconds.
 */
const ASK_GRACE_MS = 15_000;

/**
 * Answers a page that asks for the server build, and notes that it listens.
 *
 * @param client the page that asked
 */
export async function answerBuildStatus(client: Client): Promise<void> {
  listeningPages.add(client.id);
  waitingForPage.get(client.id)?.();
  await reportBuildStatus(client);
}

function asksForBuild(clientId: string): Promise<boolean> {
  if (listeningPages.has(clientId)) return Promise.resolve(true);
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      waitingForPage.delete(clientId);
      resolve(false);
    }, ASK_GRACE_MS);
    waitingForPage.set(clientId, () => {
      clearTimeout(timer);
      waitingForPage.delete(clientId);
      resolve(true);
    });
  });
}

async function noteServerBuild(build: string): Promise<void> {
  // a page firing a dozen prefetches is refused a dozen times
  if (build === serverBuild) return;
  serverBuild = build;
  await reportBuildStatus();
}

/** The path of a page's address; `URL.canParse` is missing in Safari before 17. */
function pathOf(url: string): string | undefined {
  try {
    return new URL(url).pathname;
  } catch {
    return undefined;
  }
}

/** How long the worker looks for the page a cached copy was served to, see `servedPage`. */
const FIND_PAGE_MS = 5000;
const FIND_PAGE_INTERVAL_MS = 250;

/**
 * The page the worker serves a cached copy to, looked up as soon as it exists. Call it when the
 * copy is served, not when the network answers: by then the page may have navigated on the
 * client to another path, and WebKit, which leaves `resultingClientId` empty, can only be matched
 * by the path the page was loaded at.
 *
 * @param clientId the page the navigation creates, empty in WebKit
 * @param path the path the page is loaded at
 */
export async function servedPage(clientId: string, path: string): Promise<Client | undefined> {
  // started when the copy is served and awaited only if the network answers, so it never rejects
  try {
    const deadline = Date.now() + FIND_PAGE_MS;
    for (;;) {
      const pages = clientId === '' ? await self.clients.matchAll({ type: 'window' }) : [];
      const client =
        clientId === ''
          ? pages.find((page) => pathOf(page.url) === path)
          : await self.clients.get(clientId);
      if (client !== undefined || Date.now() >= deadline) return client;
      await new Promise((resolve) => setTimeout(resolve, FIND_PAGE_INTERVAL_MS));
    }
  } catch (error) {
    console.warn(`[SW] Could not find the page ${path} was served to`, error);
    return undefined;
  }
}

/** Reloads a page at the address it shows now, which the `Client` it was found as may not. */
async function reload(client: WindowClient): Promise<boolean> {
  try {
    const current = await self.clients.get(client.id);
    const url = current?.url ?? client.url;
    return (await client.navigate(url)) !== null;
  } catch (error) {
    console.warn(`[SW] Could not reload ${client.url}`, error);
    return false;
  }
}

/**
 * Compares the cached page the worker served while the network was slow with the network's late
 * answer for it. When they come from different builds, reports it and tells the pages the build
 * the server runs, so the outdated one loads its next page from the server.
 *
 * Not reloaded on the spot: the late answer can come many seconds after the page appeared, while
 * someone is typing. Only a page that never asks for the build, one whose bundle predates
 * `useFullLoadAfterRelease`, is reloaded, since nothing else gets it off the old build; the
 * network has answered, so the reload loads the new one.
 *
 * @param cached a clone of the cached page, taken before it was served
 * @param late the network's answer, or undefined when none came
 * @param page the page the copy was served to, see `servedPage`
 * @param path the page's path
 * @param startedAt when the request went out
 */
export async function reportStaleBuildPage(
  cached: Response,
  late: Response | undefined,
  page: Promise<Client | undefined>,
  path: string,
  startedAt: number,
): Promise<void> {
  if (!late?.ok) return;
  const [cachedBuild, lateBuild] = await Promise.all([
    documentBuild(cached),
    documentBuild(late.clone()),
  ]);
  if (cachedBuild === undefined || lateBuild === undefined || cachedBuild === lateBuild) return;
  console.warn(`[SW] Served ${path} of build ${cachedBuild} while the server runs ${lateBuild}`);
  const lateMs = Date.now() - startedAt;
  await noteServerBuild(lateBuild);
  const client = await page;
  const listens = client === undefined || (await asksForBuild(client.id));
  // Not every browser lets a worker navigate its pages; that page keeps the old build.
  const reloading = !listens && 'navigate' in client;
  const properties = {
    path,
    cached_build: cachedBuild,
    server_build: lateBuild,
    late_ms: lateMs,
    reloading,
  };
  // sent before the reload, which unloads the page that passes it on to PostHog
  await capture(client?.id ?? '', 'stale_build_page_served', properties);
  if (reloading && !(await reload(client as WindowClient))) {
    // the page is still there to pass this one on
    await capture(client.id, 'stale_build_page_reload_failed', properties);
  }
}

/**
 * Does what the app path in the fetch handler does for Serwist's page route, `NetworkFirst` with a
 * timeout, which is where page loads go when the worker cannot tell the app's requests apart:
 * WebKit's navigations carry neither the app's user agent nor the id of the page they create.
 * On the timeout the strategy serves the cached copy and lets the network request run on; this
 * keeps a copy of what it served and checks the network's answer when it lands.
 */
export const staleBuildPagePlugin: SerwistPlugin = {
  requestWillFetch: ({ request, state }) => {
    if (state) state['startedAt'] = Date.now();
    return request;
  },
  cachedResponseWillBeUsed: ({ cachedResponse, request, event, state }) => {
    if (cachedResponse && state) {
      state['served'] = cachedResponse.clone();
      const clientId = 'resultingClientId' in event ? (event as FetchEvent).resultingClientId : '';
      state['page'] = servedPage(clientId, new URL(request.url).pathname);
    }
    return cachedResponse;
  },
  fetchDidSucceed: ({ request, response, event, state }) => {
    const served: unknown = state?.['served'];
    const page = state?.['page'] as Promise<Client | undefined> | undefined;
    if (served instanceof Response && page !== undefined) {
      const startedAtValue: unknown = state?.['startedAt'];
      const startedAt = typeof startedAtValue === 'number' ? startedAtValue : Date.now();
      event.waitUntil(
        reportStaleBuildPage(
          served,
          response.clone(),
          page,
          new URL(request.url).pathname,
          startedAt,
        ),
      );
    }
    return response;
  },
};

/**
 * Reports a Flight request the proxy turned away because its page runs another build, once per
 * page, and tells the pages the build the server runs.
 *
 * @param request the page's request, carrying its build in `x-deployment-id`
 * @param response the network's answer
 * @param clientId the page that sent the request
 * @param path the requested path
 */
export async function reportSkewRefusal(
  request: Request,
  response: Response,
  clientId: string,
  path: string,
): Promise<void> {
  if (response.status !== 409) return;
  const refusedBy = response.headers.get(SERVER_DEPLOYMENT_ID_HEADER);
  if (refusedBy === null) return;
  await noteServerBuild(refusedBy);
  if (clientId === '' || refusedClients.has(clientId)) return;
  refusedClients.add(clientId);
  await capture(clientId, 'deployment_skew_refused', {
    path,
    client_build: request.headers.get('x-deployment-id') ?? '',
    server_build: refusedBy,
    prefetch: request.headers.has('Next-Router-Prefetch'),
  });
}
