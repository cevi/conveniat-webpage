import fs from 'node:fs';
import path from 'node:path';

jest.mock('serwist', () => ({ CacheFirst: jest.fn(), ExpirationPlugin: jest.fn() }));
jest.mock('@/features/service-worker/offline-support/offline-registry', () => ({
  offlineRegistry: { register: jest.fn() },
}));

/** The font stacks a MapLibre style labels with, as MapLibre puts them into the glyph URL. */
const fontStacksOf = (styleFile: string): Set<string> => {
  const style = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), 'public/vector-map', styleFile), 'utf8'),
  ) as { layers: { layout?: { 'text-font'?: unknown } }[] };

  const stacks = new Set<string>();
  const collect = (value: unknown): void => {
    if (!Array.isArray(value)) return;
    if (value.length > 0 && value.every((font) => typeof font === 'string' && font.includes(' '))) {
      stacks.add(value.join(','));
      return;
    }
    for (const item of value) collect(item);
  };
  for (const layer of style.layers) collect(layer.layout?.['text-font']);
  return stacks;
};

describe('map label fonts offline', () => {
  let glyphUrls: string[];

  beforeAll(async () => {
    // the module picks its campsite from the worker's origin when it loads
    Object.defineProperty(globalThis, 'self', {
      value: { location: { origin: 'https://conveniat27.ch' } },
      configurable: true,
    });
    ({ glyphUrlsToPrecache: glyphUrls } =
      await import('@/features/service-worker/offline-support/map-viewer'));
  });

  afterAll(() => {
    Reflect.deleteProperty(globalThis, 'self');
  });

  it.each(['base_style.json', 'camp_style.json'])(
    'downloads every font %s labels with',
    (styleFile) => {
      const downloaded = new Set(
        glyphUrls.map((url) => decodeURIComponent(url.split('/fonts/')[1]?.split('/')[0] ?? '')),
      );

      const missing = [...fontStacksOf(styleFile)].filter((stack) => !downloaded.has(stack));

      expect(missing).toEqual([]);
    },
  );
});
