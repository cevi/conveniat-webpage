import type { CampMapAnnotationPoint, CampMapAnnotationPolygon } from '@/features/map/types/types';
import { useQueryState } from '@/hooks/use-query-state';
import { useCallback, useEffect, useState } from 'react';

const LOCATION_ID_PARAMETER = 'locationId';

/** The annotation the URL asks for, read once at mount. `undefined` in any non-browser context. */
const readLocationIdFromUrl = (): string | undefined => {
  // eslint-disable-next-line unicorn/no-typeof-undefined -- `location` is not declared off a browser
  if (typeof globalThis.location === 'undefined') return undefined;

  const value = new URL(globalThis.location.href).searchParams.get(LOCATION_ID_PARAMETER);
  return value === null || value === '' ? undefined : value;
};

export const useMapUrlSync = (
  openAnnotation: CampMapAnnotationPoint | CampMapAnnotationPolygon | undefined,
  setOpenAnnotation: (anno: CampMapAnnotationPoint | CampMapAnnotationPolygon | undefined) => void,
  closeDrawer: () => void,
  points: CampMapAnnotationPoint[],
  polygons: CampMapAnnotationPolygon[],
  enabled: boolean = true,
): void => {
  /**
   * An annotation the URL named that has not been found yet.
   *
   * A link into the map arrives before anything is known about the annotation it points at: the
   * map fetches its own data, and a lookup done once at mount misses whenever that data is not
   * there yet. Worse, missing it used to clear the parameter - the sync below writes the open
   * annotation back to the URL, and with nothing open that meant deleting the id the visitor had
   * just followed. Holding on to it keeps the link alive until it can be resolved.
   */
  const [pendingLocationId, setPendingLocationId] = useState<string | undefined>(() =>
    enabled ? readLocationIdFromUrl() : undefined,
  );

  const handleQueryChange = useCallback(
    (newValue: string | undefined): void => {
      if (newValue === undefined || newValue === '') {
        setPendingLocationId(undefined);
        closeDrawer();
      } else {
        const foundAnnotation =
          points.find((a) => a.id === newValue) ?? polygons.find((a) => a.id === newValue);
        if (foundAnnotation) {
          setPendingLocationId(undefined);
          setOpenAnnotation(foundAnnotation);
        } else {
          // not loaded yet - the effect below picks it up as soon as it is
          setPendingLocationId(newValue);
        }
      }
    },
    [closeDrawer, points, polygons, setOpenAnnotation],
  );

  useEffect(() => {
    if (!enabled || pendingLocationId === undefined) return;

    if (openAnnotation?.id === pendingLocationId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clearing a resolved id, once
      setPendingLocationId(undefined);
      return;
    }

    const foundAnnotation =
      points.find((a) => a.id === pendingLocationId) ??
      polygons.find((a) => a.id === pendingLocationId);

    if (foundAnnotation !== undefined) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- the annotation has arrived
      setPendingLocationId(undefined);
      setOpenAnnotation(foundAnnotation);
    }
  }, [enabled, pendingLocationId, points, polygons, openAnnotation?.id, setOpenAnnotation]);

  // while the id is still pending it is also what the URL keeps saying, so the sync below leaves
  // the parameter alone instead of deleting a link that is only a moment from resolving
  useQueryState(
    LOCATION_ID_PARAMETER,
    openAnnotation?.id ?? pendingLocationId,
    handleQueryChange,
    enabled,
  );
};
