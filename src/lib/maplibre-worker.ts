import { getVersion, setWorkerUrl } from 'maplibre-gl';

/**
 * Where `build:map-worker` writes the self-contained MapLibre worker bundle.
 *
 * The MapLibre version is part of the file name because the library and its worker only
 * understand each other at the same version, and nginx serves everything in `public/` as
 * immutable for a year. Under one fixed name a browser kept the worker of the previous release
 * and paired it with the new library: every tile failed to parse and the base map stayed blank
 * (#2257).
 *
 * `.js` on purpose: the proxy passes it through as a static asset and Serwist precaches it
 * with the rest of `public/`, so the map keeps rendering offline.
 * @returns the URL of the worker built for the MapLibre version in this bundle
 */
export const getMapLibreWorkerUrl = (): string => `/maplibre-gl-worker-${getVersion()}.js`;

/**
 * Points MapLibre at our self-hosted worker. Call before creating a map.
 *
 * maplibre-gl 6 derives its worker URL from `import.meta.url`, which Turbopack rewrites into
 * a reference to the wrong file (the main library, not the worker). Workers then boot without
 * their message handlers and no tile is ever parsed: the map renders controls and markers on a
 * blank background. The shipped worker also imports a sibling chunk, which Turbopack does not
 * emit next to it, so we bundle both into one file instead of pointing at the emitted asset.
 */
export const configureMapLibreWorker = (): void => {
  setWorkerUrl(getMapLibreWorkerUrl());
};
