import { type Histogram, metrics, ValueType } from '@opentelemetry/api';

/**
 * How long every request to Cevi.DB took and how it ended, as one Prometheus histogram.
 *
 * The span metrics already count `HitobitoClient` spans, but they cannot answer the
 * questions that matter when the login or a sync breaks: a timeout and a refused connection
 * carry no status code, an expired browser session answers `200` with the sign-in page, the
 * OAuth calls of the login never pass through the client, and every number depends on the
 * trace sampling ratio and on Tempo's metrics generator. Recorded here, each request counts
 * once, on every deployment, with the reason it failed.
 *
 * Exported through the Prometheus exporter in `src/tracing.ts` (`:9464`). Every attribute
 * comes from a small fixed set: `route` is a template such as `/api/people/:id`, never a
 * concrete path.
 *
 * Kept apart from the client so the sign-in code can record its OAuth calls without
 * importing the rest of it, as with `@/lib/hitobito/user-agent`.
 */

/** Which of the three ways in a request took. */
export type CeviDatabaseChannel =
  /** The JSON API, authenticated with the service token. */
  | 'api'
  /** The web interface, read with the stored browser session. */
  | 'frontend'
  /** The OAuth endpoints of the login: token exchange, refresh, profile and revoke. */
  | 'oauth';

/** How a request to Cevi.DB ended. */
export type CeviDatabaseOutcome =
  | 'ok'
  /** A redirect that was not followed, which the JSON API never sends. */
  | 'redirect'
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'rate_limited'
  /** Any other 4xx. */
  | 'client_error'
  | 'server_error'
  /** A frontend request answered with the sign-in page: the stored browser cookie is dead. */
  | 'session_expired'
  /** Aborted by our timeout before Cevi.DB answered. */
  | 'timeout'
  /** No answer at all: DNS, a refused or reset connection. */
  | 'network';

/**
 * Buckets in seconds. Cevi.DB answers in a few hundred milliseconds when it is well and
 * pages a group's people in seconds; the client gives up after 20, so the tail stops there.
 */
const DURATION_BUCKETS_SECONDS = [0.05, 0.1, 0.25, 0.5, 1, 2, 3, 5, 10, 20];

let durationHistogram: Histogram | undefined;

/**
 * Takes the meter on first use rather than at module scope: `payload.config.ts` reaches the
 * client while the SDK is still starting, and a meter taken then stays a no-op for the life
 * of the process. See `startRuntimeMetrics` in `src/tracing.ts`.
 */
const getDurationHistogram = (): Histogram => {
  durationHistogram ??= metrics
    .getMeter('cevidb')
    .createHistogram('cevidb_request_duration_seconds', {
      description: 'Duration of a request to Cevi.DB, in seconds, by channel, route and outcome',
      valueType: ValueType.DOUBLE,
      advice: { explicitBucketBoundaries: DURATION_BUCKETS_SECONDS },
    });
  return durationHistogram;
};

/**
 * The route of a Cevi.DB path or URL: its path with every numeric segment replaced by `:id`,
 * so `/groups/4105/people.json?page=2` names `/groups/:id/people.json`.
 *
 * Span names and metric attributes both carry it, and each distinct value is a series of its
 * own. Named after the concrete path, a single Hof sync created a few hundred of them, each
 * used once. The concrete path stays on the span as `url.path`, which a trace search filters on.
 */
export function routeTemplate(pathOrUrl: string): string {
  const { pathname } = new URL(pathOrUrl, 'https://cevi-db.invalid');
  return pathname.replaceAll(/\/\d+(?=[./]|$)/g, '/:id');
}

/** The outcome of a request Cevi.DB answered with `status`. */
export function outcomeOfStatus(status: number): CeviDatabaseOutcome {
  if (status < 300) return 'ok';
  if (status < 400) return 'redirect';
  if (status === 401) return 'unauthorized';
  if (status === 403) return 'forbidden';
  if (status === 404) return 'not_found';
  if (status === 429) return 'rate_limited';
  if (status < 500) return 'client_error';
  return 'server_error';
}

/** The outcome of a request whose `fetch` threw instead of answering. */
export function outcomeOfError(error: unknown): CeviDatabaseOutcome {
  const name = error instanceof Error ? error.name : undefined;
  return name === 'AbortError' || name === 'TimeoutError' ? 'timeout' : 'network';
}

/** One request to Cevi.DB. `route` must be a template, see `routeTemplate`. */
export interface CeviDatabaseRequest {
  channel: CeviDatabaseChannel;
  method: string;
  route: string;
}

/**
 * Starts timing a request and returns the function that records it once its outcome is known.
 *
 * For callers that learn the outcome only after the response, like a frontend request that
 * turns out to be the sign-in page. Everything else uses `measureCeviDatabaseFetch`.
 */
export function startCeviDatabaseRequest(
  request: CeviDatabaseRequest,
): (outcome: CeviDatabaseOutcome) => void {
  const startedAt = performance.now();
  return (outcome) => {
    getDurationHistogram().record((performance.now() - startedAt) / 1000, {
      channel: request.channel,
      method: request.method,
      route: request.route,
      outcome,
    });
  };
}

/** Sends a request to Cevi.DB with `send` and records how long it took and how it ended. */
export async function measureCeviDatabaseFetch(
  request: CeviDatabaseRequest,
  send: () => Promise<Response>,
): Promise<Response> {
  const finish = startCeviDatabaseRequest(request);
  try {
    const response = await send();
    finish(outcomeOfStatus(response.status));
    return response;
  } catch (error) {
    finish(outcomeOfError(error));
    throw error;
  }
}
