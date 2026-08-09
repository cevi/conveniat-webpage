# Infinite RSC prefetch loop — investigation

Status: **root cause confirmed**. Fix pending (see "Fix options").

## Symptom

A page issues the same RSC prefetch over and over, as fast as the network allows —
thousands of identical requests, effectively a self inflicted DDoS.

```
willkommen-beim-cevi?_rsc=j_10R3Xc1psDef0x   200   76 ms   fetch.ts:23
⚙ willkommen-beim-cevi?_rsc=j_10R3Xc1psDef0x 200   74 ms   sw.js:1
willkommen-beim-cevi?_rsc=j_10R3Xc1psDef0x   200   80 ms   fetch.ts:23
⚙ …
```

`fetch.ts:23` is Next.js' segment-cache internal fetch
(`next/dist/client/components/segment-cache/fetch.ts`), so the loop is driven by the
client router. `sw.js:1` is our service worker, which is in the path for every request
but is **not** causal (see "Ruled out").

Server side, on the dev stack, referer = the homepage, so it is a link prefetch:

```
15:09:59 "GET /blog/willkommen-beim-cevi?_rsc=j_10R3Xc1psDef0x" 200 39179
15:09:59 "GET /blog/willkommen-beim-cevi?_rsc=j_10R3Xc1psDef0x" 200 39202
15:09:59 "GET /blog/willkommen-beim-cevi?_rsc=j_10R3Xc1psDef0x" 200 39223
```

All `200`, no redirects — and the body length changes every time.

## Root cause

The same URL returns **different RSC payloads depending on which replica answers**.

Diffing two consecutive payloads, the difference is inside the flight router tree:

```
["slugs","%%drp:slugs:4be0a2d8c6bc2%%","oc",[...]]     ← replica A
["slugs","%%drp:slugs:548bef163c1e4%%","oc",[...]]     ← replica B
```

That is Next.js' opaque _fallback route param_ placeholder, minted with `Math.random()`
per request in `next/dist/server/request/fallback-params.js`:

```js
const uniqueID = Math.random().toString(16).slice(2);
...
// Generate a unique key for the fallback route param, if this key is found
// in the static output, it represents a bug in cache components.
keys.set(paramName, [`%%drp:${paramName}:${uniqueID}%%`, …]);
```

The chain:

1. `isBuildPhase()` is true during `next build` — both because `NEXT_PHASE=phase-production-build`
   and because the Docker builder stage sets no `DATABASE_URI`
   (`src/utils/build-phase.ts`, `Dockerfile` builder stage). So `forceDynamicOnBuild()`
   awaits `connection()` and `CMSPage` returns `<></>`
   (`src/app/(frontend)/[locale]/[design]/(payload-pages)/[[...slugs]]/page.tsx`).
   The build therefore never reaches any `'use cache'` call for this route — the baked
   `.next/cache/fs-fallback` contains exactly **1** entry.
2. The catch-all route has no `generateStaticParams` for `slugs`, so `slugs` is a
   _fallback route param_ and the route is served from a PPR **fallback shell**.
3. At runtime each replica renders that shell once, embedding its own random token, and
   caches it. The singular `cacheHandler` is **not** configured, so this cache is Next's
   default per-process store. Only `cacheHandlers.default` (the `use cache` CacheHandlerV2
   API) is configured, and that only shares `'use cache'` results, not the shell.
4. `replicas: 2`; nginx proxies to `http://payload:3000`, the Docker Swarm service VIP,
   which round-robins per connection. So the same URL alternates between two shells.
5. Next.js' client segment cache keys segments by vary paths that encode param values.
   A param whose value differs on every other response means the entry it just wrote never
   matches the next response, so it refetches immediately — forever.

## Evidence

| Check                                                                    | Result                                                     |
| ------------------------------------------------------------------------ | ---------------------------------------------------------- |
| Distinct tokens over 20 requests through the LB                          | exactly **2**, split 10/10                                 |
| Payload replica count                                                    | **2**                                                      |
| Image digest on both replicas                                            | identical (`sha256:7f14e80c…`)                             |
| Token baked into the image                                               | `2129242bd60d38` — **served by neither replica**           |
| Same replica, LB bypassed (`docker exec` → `127.0.0.1:3000`), 6 requests | exactly **1** token                                        |
| Same replica, 5 requests, md5 of body                                    | **5/5 identical**                                          |
| Three different URLs (`/blog/…`, `/kontakt`, `/spenden`)                 | **same pair of tokens** → one shell per route, per replica |
| Prod (`conveniat27.ch`)                                                  | same behaviour, 2 tokens                                   |
| `x-nextjs-cache` on every response                                       | `HIT` → served from a per-replica cache                    |
| Route/shell entries on disk (`.next/cache`)                              | none — only `fetch-cache` and `images`                     |

Correlates with the error flooding the payload logs (~700 occurrences in a 400-line
window across replicas):

```
Error: Unexpected cache miss after cache warming phase during prerendering. This is
likely caused by non-deterministic arguments that differ between the cache warming
phase and the final prerender phase (e.g. unstable array order).
```

Both miss branches in `next/dist/server/use-cache/use-cache-wrapper.js` return
`makeRuntimeHangingPromise(...)` — a dynamic hole — which is why the route cannot be
resolved into a static shell.

## Upstream status

The randomness is unfixed in current canary, and Next's own source comment calls its
appearance in emitted output "a bug in cache components".
[vercel/next.js#93897](https://github.com/vercel/next.js/issues/93897) tracks `%%drp:`
leakage at build time. The **multi-replica** variant of this appears unreported upstream
and is worth filing.

## Ruled out

- **The service worker.** It appears in every looping pair only because it proxies all
  requests. A Chromium probe shows a service-worker response reaches the page with
  `response.url` populated from the request URL, so Next's `getRenderedSearch` fallback
  never throws. Rebuilding the response does mask redirects, but the looping requests are
  plain `200`s with no redirect involved.
- **The `_rsc` cache-busting hash.** Server-side validation is working; real clients get
  `200` directly, not `307`.
- **nginx.** It only caches `/_next/static`, `/_next/image` and public file extensions —
  never documents or RSC.

## Why the baked shell is not served

The build _does_ bake a deterministic shell (token `2129242bd60d38` in this image), but the
prerender manifest gives every dynamic route `fallbackRevalidate: 60`:

```
/de/design-mode-web/[[...slugs]]  →  { fallbackRevalidate: 60, fallbackExpire: 31536000 }
```

Staleness is computed from the _file mtime_ of the baked artefacts plus 60 s
(`incremental-cache/index.js` → `calculateRevalidate`), and those mtimes are fixed at build
time. So the baked shell is **already stale on the first request after every deploy**.
`ResponseCache.handleGet` serves the stale baked entry once, then immediately revalidates,
which re-renders and mints a fresh `Math.random()` token — per replica. From then on each
replica serves its own token.

Route responses are stored by the **singular `cacheHandler`** (`APP_PAGE` / `APP_ROUTE` /
`FETCH` / `IMAGE` entries), which this app does **not** configure — so the store defaults to
`FileSystemCache`: a per-process 50 MB LRU over per-container `.next/server/app`. The
configured `cacheHandlers` (plural) only ever serves `'use cache'` results and never sees
route shells. `cacheComponents: true` does not disable the singular handler — there is no
branch, warning, or validation that does so.

## Fix options

Requirement: for a given URL, every replica must return byte-identical shell bytes, or the
route must not use a fallback shell at all.

1. **Configure the singular `cacheHandler` (Redis) + `cacheMaxMemorySize: 0`** — the
   officially documented fix for multi-instance self-hosting, and it composes with the
   existing `cacheHandlers`. The token is minted inside the render that produces the cache
   entry and stored in the entry's bytes, which are served verbatim on a hit, so a shared
   store makes every replica serve the same token. Residual caveat: when two replicas
   revalidate the same key concurrently they each render a token and last-write-wins, giving
   a brief divergence window before they converge.
2. **Keep serving the build-baked shell** by making the fallback shell non-revalidating.
   Fallback entries with no manifest cache control never go stale, so every replica would
   serve the identical baked bytes forever. Needs a way to get `fallbackRevalidate: false`
   for this route — currently every dynamic route gets `60`.
3. **Remove the fallback shell** via `generateStaticParams`. Requires database access during
   `next build`, which the builder stage does not have — that is exactly why
   `forceDynamicOnBuild()` exists.
4. **Run a single payload replica.** Correct but loses redundancy.

Not a fix: **sticky sessions**. Next.js documents no such requirement, and mechanically it
would not work here anyway — nginx proxies to the Swarm VIP `http://payload:3000`, so the
round-robin happens at the nginx→payload hop, below Traefik.

Any fix must not change what the service worker caches for offline use. Options 1–4 are all
server-side only and neutral for offline support. Today's divergence is in fact _bad_ for
offline: the service worker caches whichever replica's shell it happened to fetch, so a
replayed payload can carry a different token than the live page expects.

## Related: `Uncaught SyntaxError: Unexpected token '<'` on chunks

Distinct failure, same family (multiple replicas / version skew): a client loads HTML from
one build and requests a chunk that the replica answering does not have. `nginx/nginx.conf`
already guards `/_next/static/` with `proxy_intercept_errors on; error_page 404 … /empty_404`,
returning valid empty JS instead of an HTML 404, so the remaining gap is version skew itself.
Next.js' documented mechanism for that is `deploymentId` (version skew protection) plus a
stable `generateBuildId`, neither of which is configured here.

## Deployment notes found along the way

- The `/app/.next/cache` bind mount shadows the image's `.next/cache/fs-fallback`
  directory, so the build cache the `Dockerfile` copies in is not visible at runtime.
- `Orchestrator.get()` never falls back to `fsCache` at runtime, so that build cache would
  be unreachable even without the mount.
- The deployed compose files under `/cluster/swarm/stacks/` have drifted from the repo's
  `docker-compose.prod.yml` / `docker-compose.dev.yml` (different checksums).
