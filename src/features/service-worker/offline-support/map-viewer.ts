import type { Serwist } from 'serwist';
import { type RouteHandler } from 'serwist';

const revision = 'v2025-06-18';
const tilesBaseUrl = 'https://vectortiles0.geo.admin.ch/tiles/';
const tilesStyleBaseUrl = 'https://vectortiles.geo.admin.ch/tiles/';
const stylesBaseUrl = 'https://vectortiles.geo.admin.ch/styles/';
const fontBaseUrl = 'https://vectortiles.geo.admin.ch/fonts/';

const urlsToPrecache: string[] = [
  // map viewer page
  '/app/map',

  // fonts for map viewer
  `${fontBaseUrl}Frutiger%20Neue%20Italic/0-255.pbf`,
  `${fontBaseUrl}Frutiger%20Neue%20Condensed%20Regular/0-255.pbf`,
  `${fontBaseUrl}Frutiger%20Neue%20Regular/0-255.pbf`,

  // configs for map viewer
  `${tilesStyleBaseUrl}ch.swisstopo.base.vt/v1.0.0/tiles.json`,
  `${tilesStyleBaseUrl}ch.swisstopo.relief.vt/v1.0.0/tiles.json`,
  `${stylesBaseUrl}ch.swisstopo.basemap_world.vt/sprite/sprite.json`,
  `${stylesBaseUrl}ch.swisstopo.basemap_world.vt/sprite/sprite.png`,

  // map tiles - base
  `${tilesBaseUrl}ch.swisstopo.base.vt/v1.0.0/12/2141/1449.pbf`,
  `${tilesBaseUrl}ch.swisstopo.base.vt/v1.0.0/12/2142/1448.pbf`,
  `${tilesBaseUrl}ch.swisstopo.base.vt/v1.0.0/13/4283/2897.pbf`,
  `${tilesBaseUrl}ch.swisstopo.base.vt/v1.0.0/13/4284/2896.pbf`,
  `${tilesBaseUrl}ch.swisstopo.base.vt/v1.0.0/14/8568/5797.pbf`,
  `${tilesBaseUrl}ch.swisstopo.base.vt/v1.0.0/13/4283/2898.pbf`,
  `${tilesBaseUrl}ch.swisstopo.base.vt/v1.0.0/13/4285/2896.pbf`,
  `${tilesBaseUrl}ch.swisstopo.base.vt/v1.0.0/14/8569/5797.pbf`,
  `${tilesBaseUrl}ch.swisstopo.base.vt/v1.0.0/13/4283/2899.pbf`,
  `${tilesBaseUrl}ch.swisstopo.base.vt/v1.0.0/14/8568/5794.pbf`,
  `${tilesBaseUrl}ch.swisstopo.base.vt/v1.0.0/14/8570/5797.pbf`,
  `${tilesBaseUrl}ch.swisstopo.base.vt/v1.0.0/13/4284/2899.pbf`,
  `${tilesBaseUrl}ch.swisstopo.base.vt/v1.0.0/13/4285/2898.pbf`,
  `${tilesBaseUrl}ch.swisstopo.base.vt/v1.0.0/12/2141/1448.pbf`,
  `${tilesBaseUrl}ch.swisstopo.base.vt/v1.0.0/13/4283/2896.pbf`,
  `${tilesBaseUrl}ch.swisstopo.base.vt/v1.0.0/13/4285/2899.pbf`,
  `${tilesBaseUrl}ch.swisstopo.base.vt/v1.0.0/14/8570/5794.pbf`,
  `${tilesBaseUrl}ch.swisstopo.base.vt/v1.0.0/14/8569/5795.pbf`,
  `${tilesBaseUrl}ch.swisstopo.base.vt/v1.0.0/14/8570/5795.pbf`,
  `${tilesBaseUrl}ch.swisstopo.base.vt/v1.0.0/14/8569/5796.pbf`,
  `${tilesBaseUrl}ch.swisstopo.base.vt/v1.0.0/14/8570/5796.pbf`,

  // map tiles - relief
  `${tilesBaseUrl}ch.swisstopo.relief.vt/v1.0.0/12/2141/1449.pbf`,
  `${tilesBaseUrl}ch.swisstopo.relief.vt/v1.0.0/12/2142/1448.pbf`,
  `${tilesBaseUrl}ch.swisstopo.relief.vt/v1.0.0/13/4283/2897.pbf`,
  `${tilesBaseUrl}ch.swisstopo.relief.vt/v1.0.0/12/2142/1449.pbf`,
  `${tilesBaseUrl}ch.swisstopo.relief.vt/v1.0.0/13/4283/2898.pbf`,
  `${tilesBaseUrl}ch.swisstopo.relief.vt/v1.0.0/14/8569/5797.pbf`,
  `${tilesBaseUrl}ch.swisstopo.relief.vt/v1.0.0/13/4283/2899.pbf`,
  `${tilesBaseUrl}ch.swisstopo.relief.vt/v1.0.0/14/8568/5794.pbf`,
  `${tilesBaseUrl}ch.swisstopo.relief.vt/v1.0.0/14/8570/5797.pbf`,
  `${tilesBaseUrl}ch.swisstopo.relief.vt/v1.0.0/13/4284/2899.pbf`,
  `${tilesBaseUrl}ch.swisstopo.relief.vt/v1.0.0/13/4285/2898.pbf`,
  `${tilesBaseUrl}ch.swisstopo.relief.vt/v1.0.0/12/2141/1448.pbf`,
  `${tilesBaseUrl}ch.swisstopo.relief.vt/v1.0.0/13/4285/2899.pbf`,
  `${tilesBaseUrl}ch.swisstopo.relief.vt/v1.0.0/14/8569/5795.pbf`,
  `${tilesBaseUrl}ch.swisstopo.relief.vt/v1.0.0/14/8570/5794.pbf`,
  `${tilesBaseUrl}ch.swisstopo.relief.vt/v1.0.0/14/8568/5796.pbf`,
  `${tilesBaseUrl}ch.swisstopo.relief.vt/v1.0.0/14/8570/5795.pbf`,
  `${tilesBaseUrl}ch.swisstopo.relief.vt/v1.0.0/14/8569/5796.pbf`,
  `${tilesBaseUrl}ch.swisstopo.relief.vt/v1.0.0/14/8570/5796.pbf`,
];

/**
 * Rewrites failed tile requests to the primary tile server.
 * As by default we are fetching tiles from `vectortiles[0-4].geo.admin.ch`,
 * this function rewrites the URL to `vectortiles0.geo.admin.ch`
 * to ensure that the request is served from the primary tile server as
 * the fallback.
 *
 * @param serwist
 */
const tileURLRewriter = (serwist: Serwist): RouteHandler => {
  return async ({ request }) => {
    // Check if the failed request URL matches a Swisstopo tile pattern
    // This regex will capture the layer, version, and x/y/z coordinates
    const tileRegex =
      /https:\/\/vectortiles[0-4]\.geo\.admin\.ch\/tiles\/(ch\.swisstopo\..*\.vt\/v[0-9]\.[0-9]\.[0-9])\/([0-9]+\/[0-9]+\/[0-9]+\.pbf)/;
    const match = request.url.match(tileRegex);

    if (match?.[1] !== undefined && match[2] !== undefined) {
      const tilePath = match[1]; // e.g., ch.swisstopo.relief.vt/v1.0.0
      const coordsAndFile = match[2]; // e.g., 12/2141/1449.pbf

      // Construct the new URL using the desired base URL (vectortiles0)
      const newTileUrl = `https://vectortiles0.geo.admin.ch/tiles/${tilePath}/${coordsAndFile}`;

      console.log(`Rewriting failed tile request from ${request.url} to ${newTileUrl}`);

      // Try to fetch the tile from the rewritten URL using a CacheFirst strategy
      try {
        const cachedResponse = await caches.match(newTileUrl);
        if (cachedResponse) {
          return cachedResponse;
        } else {
          console.warn(`Tile not found in cache for rewritten URL: ${newTileUrl}`);
          return Response.error();
        }
      } catch (error) {
        console.error(`Error trying to fetch rewritten tile URL: ${newTileUrl}`, error);
        return Response.error();
      }
    }

    const url = new URL(request.url);
    if (url.pathname.startsWith('/app/map') && request.destination === 'document') {
      const cachedMapPage = await serwist.matchPrecache('/app/map');
      if (cachedMapPage) {
        console.log(`Serving precached /app/map for failed request to ${request.url}`);
        return cachedMapPage;
      }
    }

    // For any other failed requests, use the default fallback (e.g., /offline for documents)
    if (request.destination === 'document') {
      const _match = await serwist.matchPrecache('/~offline');
      return _match ?? Response.error();
    }

    return Response.error();
  };
};

/**
 * Pre-cache the map viewer and its tiles for offline support.
 *
 * @param serwist
 * @param revisionUuid
 */
export const addOfflineSupportForMapViewer = (serwist: Serwist, revisionUuid: string): void => {
  const precacheList = urlsToPrecache.map((preCacheURL) => ({
    url: preCacheURL,
    revision: preCacheURL === '/app/map' ? revisionUuid : revision,
  }));
  serwist.addToPrecacheList(precacheList);

  // Set a catch handler for failed requests.
  // This will be invoked when a request fails and no other route handles it.
  serwist.setCatchHandler(tileURLRewriter(serwist));

  // redirect /[en|fr|de]/app/map to /app/map
  serwist.setCatchHandler(
    async ({ request }) =>
      new Promise((resolve) => {
        const url = new URL(request.url);
        if (
          url.pathname.startsWith('/en/app/map') ||
          url.pathname.startsWith('/fr/app/map') ||
          url.pathname.startsWith('/de/app/map')
        ) {
          return resolve(Response.redirect('/app/map', 301));
        }
        return resolve(Response.error());
      }),
  );
};
