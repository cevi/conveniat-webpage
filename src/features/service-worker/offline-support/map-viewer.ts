import { CACHE_NAMES } from '@/features/service-worker/constants';
import { offlineRegistry } from '@/features/service-worker/offline-support/offline-registry';
import { CacheFirst, type RouteHandler } from 'serwist';

const tilesBaseUrl = 'https://vectortiles0.geo.admin.ch/tiles/';
const tilesStyleBaseUrl = 'https://vectortiles.geo.admin.ch/tiles/';
const stylesBaseUrl = 'https://vectortiles.geo.admin.ch/styles/';
const fontBaseUrl = 'https://vectortiles.geo.admin.ch/fonts/';

const urlsToPrecache: string[] = [
  // fonts for map viewer
  `${fontBaseUrl}Frutiger%20Neue%20Italic/0-255.pbf`,
  `${fontBaseUrl}Frutiger%20Neue%20Condensed%20Regular/0-255.pbf`,
  `${fontBaseUrl}Frutiger%20Neue%20Regular/0-255.pbf`,

  // configs for map viewer
  `${tilesStyleBaseUrl}ch.swisstopo.base.vt/v1.0.0/tiles.json`,
  `${tilesStyleBaseUrl}ch.swisstopo.relief.vt/v1.0.0/tiles.json`,

  // standard resolution sprites
  `${stylesBaseUrl}ch.swisstopo.basemap_world.vt/sprite/sprite.json`,
  `${stylesBaseUrl}ch.swisstopo.basemap_world.vt/sprite/sprite.png`,

  // high-dpi (retina) sprites
  `${stylesBaseUrl}ch.swisstopo.basemap_world.vt/sprite/sprite@2x.json`,
  `${stylesBaseUrl}ch.swisstopo.basemap_world.vt/sprite/sprite@2x.png`,

  // --- MAP TILES (Added from logs) ---
  // Zoom Levels 3-12 (Base)
  `${tilesBaseUrl}ch.swisstopo.base.vt/v1.0.0/3/4/2.pbf`,
  `${tilesBaseUrl}ch.swisstopo.base.vt/v1.0.0/4/8/5.pbf`,
  `${tilesBaseUrl}ch.swisstopo.base.vt/v1.0.0/5/16/11.pbf`,
  `${tilesBaseUrl}ch.swisstopo.base.vt/v1.0.0/6/33/22.pbf`,
  `${tilesBaseUrl}ch.swisstopo.base.vt/v1.0.0/7/66/45.pbf`,
  `${tilesBaseUrl}ch.swisstopo.base.vt/v1.0.0/8/133/90.pbf`,
  `${tilesBaseUrl}ch.swisstopo.base.vt/v1.0.0/9/267/181.pbf`,
  `${tilesBaseUrl}ch.swisstopo.base.vt/v1.0.0/10/535/362.pbf`,
  `${tilesBaseUrl}ch.swisstopo.base.vt/v1.0.0/11/1071/724.pbf`,
  `${tilesBaseUrl}ch.swisstopo.base.vt/v1.0.0/12/2141/1448.pbf`,
  `${tilesBaseUrl}ch.swisstopo.base.vt/v1.0.0/12/2141/1449.pbf`,
  `${tilesBaseUrl}ch.swisstopo.base.vt/v1.0.0/12/2142/1448.pbf`,
  `${tilesBaseUrl}ch.swisstopo.base.vt/v1.0.0/12/2142/1449.pbf`,

  // Zoom Levels 13-14 (Base & Relief)
  // Base
  `${tilesBaseUrl}ch.swisstopo.base.vt/v1.0.0/13/4283/2896.pbf`,
  `${tilesBaseUrl}ch.swisstopo.base.vt/v1.0.0/13/4283/2897.pbf`,
  `${tilesBaseUrl}ch.swisstopo.base.vt/v1.0.0/13/4283/2898.pbf`,
  `${tilesBaseUrl}ch.swisstopo.base.vt/v1.0.0/13/4283/2899.pbf`,
  `${tilesBaseUrl}ch.swisstopo.base.vt/v1.0.0/13/4284/2896.pbf`,
  `${tilesBaseUrl}ch.swisstopo.base.vt/v1.0.0/13/4284/2897.pbf`,
  `${tilesBaseUrl}ch.swisstopo.base.vt/v1.0.0/13/4284/2898.pbf`,
  `${tilesBaseUrl}ch.swisstopo.base.vt/v1.0.0/13/4284/2899.pbf`,
  `${tilesBaseUrl}ch.swisstopo.base.vt/v1.0.0/13/4285/2896.pbf`,
  `${tilesBaseUrl}ch.swisstopo.base.vt/v1.0.0/13/4285/2897.pbf`,
  `${tilesBaseUrl}ch.swisstopo.base.vt/v1.0.0/13/4285/2898.pbf`,
  `${tilesBaseUrl}ch.swisstopo.base.vt/v1.0.0/13/4285/2899.pbf`,
  `${tilesBaseUrl}ch.swisstopo.base.vt/v1.0.0/14/8568/5794.pbf`,
  `${tilesBaseUrl}ch.swisstopo.base.vt/v1.0.0/14/8568/5796.pbf`,
  `${tilesBaseUrl}ch.swisstopo.base.vt/v1.0.0/14/8568/5797.pbf`,
  `${tilesBaseUrl}ch.swisstopo.base.vt/v1.0.0/14/8569/5794.pbf`,
  `${tilesBaseUrl}ch.swisstopo.base.vt/v1.0.0/14/8569/5795.pbf`,
  `${tilesBaseUrl}ch.swisstopo.base.vt/v1.0.0/14/8569/5796.pbf`,
  `${tilesBaseUrl}ch.swisstopo.base.vt/v1.0.0/14/8569/5797.pbf`,
  `${tilesBaseUrl}ch.swisstopo.base.vt/v1.0.0/14/8570/5794.pbf`,
  `${tilesBaseUrl}ch.swisstopo.base.vt/v1.0.0/14/8570/5795.pbf`,
  `${tilesBaseUrl}ch.swisstopo.base.vt/v1.0.0/14/8570/5796.pbf`,
  `${tilesBaseUrl}ch.swisstopo.base.vt/v1.0.0/14/8570/5797.pbf`,

  // Relief
  `${tilesBaseUrl}ch.swisstopo.relief.vt/v1.0.0/12/2141/1448.pbf`,
  `${tilesBaseUrl}ch.swisstopo.relief.vt/v1.0.0/12/2141/1449.pbf`,
  `${tilesBaseUrl}ch.swisstopo.relief.vt/v1.0.0/12/2142/1448.pbf`,
  `${tilesBaseUrl}ch.swisstopo.relief.vt/v1.0.0/12/2142/1449.pbf`,
  `${tilesBaseUrl}ch.swisstopo.relief.vt/v1.0.0/13/4283/2897.pbf`,
  `${tilesBaseUrl}ch.swisstopo.relief.vt/v1.0.0/13/4283/2898.pbf`,
  `${tilesBaseUrl}ch.swisstopo.relief.vt/v1.0.0/13/4283/2899.pbf`,
  `${tilesBaseUrl}ch.swisstopo.relief.vt/v1.0.0/13/4284/2897.pbf`,
  `${tilesBaseUrl}ch.swisstopo.relief.vt/v1.0.0/13/4284/2898.pbf`,
  `${tilesBaseUrl}ch.swisstopo.relief.vt/v1.0.0/13/4284/2899.pbf`,
  `${tilesBaseUrl}ch.swisstopo.relief.vt/v1.0.0/13/4285/2897.pbf`,
  `${tilesBaseUrl}ch.swisstopo.relief.vt/v1.0.0/13/4285/2898.pbf`,
  `${tilesBaseUrl}ch.swisstopo.relief.vt/v1.0.0/13/4285/2899.pbf`,
  `${tilesBaseUrl}ch.swisstopo.relief.vt/v1.0.0/14/8568/5794.pbf`,
  `${tilesBaseUrl}ch.swisstopo.relief.vt/v1.0.0/14/8568/5796.pbf`,
  `${tilesBaseUrl}ch.swisstopo.relief.vt/v1.0.0/14/8568/5797.pbf`,
  `${tilesBaseUrl}ch.swisstopo.relief.vt/v1.0.0/14/8569/5794.pbf`,
  `${tilesBaseUrl}ch.swisstopo.relief.vt/v1.0.0/14/8569/5795.pbf`,
  `${tilesBaseUrl}ch.swisstopo.relief.vt/v1.0.0/14/8569/5796.pbf`,
  `${tilesBaseUrl}ch.swisstopo.relief.vt/v1.0.0/14/8569/5797.pbf`,
  `${tilesBaseUrl}ch.swisstopo.relief.vt/v1.0.0/14/8570/5794.pbf`,
  `${tilesBaseUrl}ch.swisstopo.relief.vt/v1.0.0/14/8570/5795.pbf`,
  `${tilesBaseUrl}ch.swisstopo.relief.vt/v1.0.0/14/8570/5796.pbf`,
  `${tilesBaseUrl}ch.swisstopo.relief.vt/v1.0.0/14/8570/5797.pbf`,
];

/**
 * Normalizes a tile URL from any load-balanced server (vectortiles0-4)
 * to the canonical vectortiles0 used for precaching.
 */
export function normalizeTileUrl(url: string): string {
  return url.replace(/vectortiles[0-9]/, 'vectortiles0');
}

export const tileURLRewriter = (): RouteHandler => {
  return async ({ request }: { request: Request }) => {
    const url = new URL(request.url);

    if (
      url.pathname.startsWith('/en/app/map') ||
      url.pathname.startsWith('/fr/app/map') ||
      url.pathname.startsWith('/de/app/map')
    ) {
      return Response.redirect('/app/map', 301);
    }

    const tileRegex =
      /https:\/\/vectortiles[0-9]?\.geo\.admin\.ch\/tiles\/(ch\.swisstopo\..*\.vt\/v[0-9]\.[0-9]\.[0-9])\/([0-9]+\/[0-9]+\/[0-9]+\.pbf)/;
    const match = request.url.match(tileRegex);

    if (match !== null) {
      const newTileUrl = normalizeTileUrl(request.url);

      try {
        const cachedResponse = await caches.match(newTileUrl);
        if (cachedResponse) return cachedResponse;
      } catch (error) {
        console.error(`Error trying to fetch rewritten tile URL: ${newTileUrl}`, error);
      }
    }

    const pagesCache = await caches.open(CACHE_NAMES.PAGES);

    // Map Page Fallback
    if (url.pathname.startsWith('/app/map') && request.destination === 'document') {
      const cachedMapPage = await pagesCache.match('/app/map', { ignoreVary: true });
      if (cachedMapPage) return cachedMapPage;
    }

    return Response.error();
  };
};

export const registerMapOfflineSupport: () => void = (): void => {
  offlineRegistry.register('map-viewer', {
    precacheAssets: urlsToPrecache,
    prefetchUrls: ['/app/map'],
    runtimeCaching: [
      {
        matcher: /https:\/\/vectortiles[0-9]?\.geo\.admin\.ch\/(tiles|styles)\/.*/,
        handler: new CacheFirst({
          cacheName: CACHE_NAMES.MAP_TILES,
        }),
      },
    ],
  });
};
