import type { Context } from '@/trpc/init';
import { createCallerFactory } from '@/trpc/init';
import { getPayload } from 'payload';

jest.mock('@payload-config', () => ({}), { virtual: true });

jest.mock('payload', () => ({ getPayload: jest.fn() }));
jest.mock('@/utils/auth', () => ({ auth: jest.fn() }));
jest.mock('@/lib/db/prisma', () => ({ __esModule: true, default: {} }));
jest.mock('@/utils/get-locale-from-cookies', () => ({
  getLocaleFromCookies: jest.fn().mockResolvedValue('de'),
}));
jest.mock('@/config/environment-variables', () => ({ environmentVariables: {} }));
jest.mock('@/features/payload-cms/payload-cms/utils/resolve-rich-text-links', () => ({
  resolveLinksInArray: jest.fn(),
}));

// `superjson` ships untranspiled ESM and is only the wire transformer; a direct caller never
// serializes anything, so a stub keeps this suite out of the ESM transform allowlist.
jest.mock('superjson', () => ({
  __esModule: true,
  default: {
    serialize: (value: unknown): { json: unknown } => ({ json: value }),
    deserialize: (value: { json: unknown }): unknown => value.json,
  },
}));

import { mapRouter } from '@/features/map/api/map-router';

const kiosk = {
  id: 'kiosk',
  title: 'Kiosk',
  annotationType: 'marker',
  geometry: [8.301, 46.502],
};

const quartier = {
  id: 'quartier-1',
  title: 'Quartier 1',
  annotationType: 'polygon',
  polygonCoordinates: [{ longitude: 8.3, latitude: 46.5 }],
};

const guest = createCallerFactory(mapRouter)({
  user: undefined,
  prisma: {},
  locale: 'de',
} as unknown as Context);

describe('the camp map for a guest who skipped the login', () => {
  beforeEach(() => {
    const find = jest.fn(({ collection }: { collection: string }) =>
      Promise.resolve({ docs: collection === 'camp-map-annotations' ? [kiosk, quartier] : [] }),
    );
    jest
      .mocked(getPayload)
      .mockResolvedValue({ find } as unknown as Awaited<ReturnType<typeof getPayload>>);
  });

  it('gets the markers and areas of the map', async () => {
    const map = await guest.getMapAnnotations({ locale: 'de' });

    expect(map.campMapAnnotationPoints.map((point) => point.title)).toEqual(['Kiosk']);
    expect(map.campMapAnnotationPolygons.map((polygon) => polygon.title)).toEqual(['Quartier 1']);
  });

  it("gets the areas for a schedule entry's mini map", async () => {
    const { polygons } = await guest.getAnnotations();

    expect(polygons.map((polygon) => polygon.title)).toEqual(['Quartier 1']);
  });
});
