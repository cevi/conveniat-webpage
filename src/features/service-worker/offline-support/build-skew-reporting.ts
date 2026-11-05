import { SERVER_DEPLOYMENT_ID_HEADER } from '@/deployment-id';
import { ServiceWorkerMessages } from '@/utils/service-worker-messages';

declare const self: ServiceWorkerGlobalScope;

/**
 * Reports to PostHog when a page of an older build stays in use after a release, the two steps
 * of a page that stops navigating (5 Nov 2026, an iPad on v1.50.0 after v1.51.0 went live):
 *
 * 1. `stale_build_page_served`: the network was slow, so the worker served its cached copy of a
 *    page, and the network's late answer for the same page came from another build. The page on
 *    screen now runs code the server no longer has.
 * 2. `deployment_skew_refused`: such a page asked for a page and the proxy turned it away with a
 *    409 (`@/proxy/deployment-skew-proxy`). The router should load the page the classic way then,
 *    and a page that keeps reporting this did not.
 *
 * Neither shows up anywhere else: the cached copy never reaches the server, and a refused request
 * ends in the proxy before a trace is written.
 */

/** Clients that already reported a refusal, so a page firing a dozen prefetches reports once. */
const refusedClients = new Set<string>();

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
 * Compares the cached page the worker served while the network was slow with the network's late
 * answer for it, and reports when they come from different builds.
 *
 * @param cached a clone of the cached page, taken before it was served
 * @param late the network's answer, or undefined when none came
 * @param clientId the page that was loaded from the cached copy
 * @param path the page's path
 * @param startedAt when the request went out
 */
export async function reportStaleBuildPage(
  cached: Response,
  late: Response | undefined,
  clientId: string,
  path: string,
  startedAt: number,
): Promise<void> {
  if (!late?.ok) return;
  const [cachedBuild, serverBuild] = await Promise.all([
    documentBuild(cached),
    documentBuild(late.clone()),
  ]);
  if (cachedBuild === undefined || serverBuild === undefined || cachedBuild === serverBuild) return;
  console.warn(`[SW] Served ${path} of build ${cachedBuild} while the server runs ${serverBuild}`);
  await capture(clientId, 'stale_build_page_served', {
    path,
    cached_build: cachedBuild,
    server_build: serverBuild,
    late_ms: Date.now() - startedAt,
  });
}

/**
 * Reports a Flight request the proxy turned away because its page runs another build, once per
 * page.
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
  if (response.status !== 409 || clientId === '' || refusedClients.has(clientId)) return;
  const serverBuild = response.headers.get(SERVER_DEPLOYMENT_ID_HEADER);
  if (serverBuild === null) return;
  refusedClients.add(clientId);
  await capture(clientId, 'deployment_skew_refused', {
    path,
    client_build: request.headers.get('x-deployment-id') ?? '',
    server_build: serverBuild,
    prefetch: request.headers.has('Next-Router-Prefetch'),
  });
}
