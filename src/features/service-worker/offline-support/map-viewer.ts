import { offlineRegistry } from '@/features/service-worker/offline-support/offline-registry';
import type { Serwist } from 'serwist';
import { CacheFirst, type RouteHandler } from 'serwist';

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
 */
export const tileURLRewriter = (serwist: Serwist): RouteHandler => {
  return async ({ request }) => {
    const url = new URL(request.url);

    if (
      url.pathname.startsWith('/en/app/map') ||
      url.pathname.startsWith('/fr/app/map') ||
      url.pathname.startsWith('/de/app/map')
    ) {
      return Response.redirect('/app/map', 301);
    }

    const tileRegex =
      /https:\/\/vectortiles[0-4]\.geo\.admin\.ch\/tiles\/(ch\.swisstopo\..*\.vt\/v[0-9]\.[0-9]\.[0-9])\/([0-9]+\/[0-9]+\/[0-9]+\.pbf)/;
    const match = request.url.match(tileRegex);

    if (match?.[1] !== undefined && match[2] !== undefined) {
      const tilePath = match[1];
      const coordsAndFile = match[2];
      const newTileUrl = `${tilesBaseUrl}${tilePath}/${coordsAndFile}`;

      try {
        const cachedResponse = await caches.match(newTileUrl);
        if (cachedResponse) return cachedResponse;
      } catch (error) {
        console.error(`Error trying to fetch rewritten tile URL: ${newTileUrl}`, error);
      }
    }

    if (url.pathname.startsWith('/app/map') && request.destination === 'document') {
      const cachedMapPage = await serwist.matchPrecache('/app/map');
      if (cachedMapPage) return cachedMapPage;
    }

    if (request.destination === 'document') {
      const _match = await serwist.matchPrecache('/~offline');
      return _match ?? Response.error();
    }

    return Response.error();
  };
};

/**
 * Register map viewer offline support.
 */
export const registerMapOfflineSupport = (): void => {
  offlineRegistry.register('map-viewer', {
    precacheAssets: urlsToPrecache,
    prefetchUrls: ['/app/map'],
    runtimeCaching: [
      {
        matcher: /https:\/\/vectortiles[0-4]\.geo\.admin\.ch\/tiles\/.*/,
        handler: new CacheFirst({
          cacheName: 'map-tiles-cache',
        }),
      },
    ],
  });
};
