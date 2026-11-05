'use client';

import { forumMapText } from '@/features/map/components/forum/forum-map-texts';
import { useMap } from '@/features/map/components/maplibre-renderer/map-context-provider';
import type { CampMapAnnotationPoint, CampMapAnnotationPolygon } from '@/features/map/types/types';
import {
  composerHrefFor,
  findNearestAnnotation,
  type NearbyAnnotation,
} from '@/features/map/utils/nearest-annotation';
import { useCurrentLocale } from '@/hooks/use-current-locale';
import type { Locale } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { CheckCircle2, Crosshair, MapPin } from 'lucide-react';
import type { Map as MaplibreMap } from 'maplibre-gl';
import { useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';

/** The map's centre, followed as the map moves under the pin. */
const useMapCentre = (map: MaplibreMap | undefined): [number, number] | undefined => {
  const [centre, setCentre] = useState<[number, number] | undefined>();
  useEffect(() => {
    if (map === undefined) return;
    const update = (): void => {
      const { lng, lat } = map.getCenter();
      setCentre([lng, lat]);
    };
    update();
    map.on('moveend', update);
    return (): void => {
      map.off('moveend', update);
    };
  }, [map]);
  return centre;
};

/**
 * Picks the spot of a post. The pin stays in the middle and the map moves under it, which one
 * thumb can do precisely. The position of the phone only centres the map, through the locate
 * button; it is never taken on its own, because a child's position is not what a report is
 * about. A map entry near the pin is offered by name.
 */
export const ForumLocationPicker: React.FC<{
  annotationPoints: readonly CampMapAnnotationPoint[];
  annotationPolygons: readonly CampMapAnnotationPolygon[];
  topicId: string | null;
}> = ({ annotationPoints, annotationPolygons, topicId }) => {
  const locale = useCurrentLocale(i18nConfig) as Locale;
  const router = useRouter();
  const map = useMap();
  const centre = useMapCentre(map);
  const nearby: NearbyAnnotation | undefined =
    centre === undefined
      ? undefined
      : findNearestAnnotation(centre, annotationPoints, annotationPolygons);
  const [useEntry, setUseEntry] = useState(true);
  const withEntry = useEntry && nearby !== undefined;

  return (
    <>
      {/* the pin over the centre of the map; its tip is the spot */}
      <div className="pointer-events-none absolute top-1/2 left-1/2 z-40 -translate-x-1/2 -translate-y-full">
        <MapPin
          className="fill-conveniat-green h-11 w-11 text-white drop-shadow-md"
          strokeWidth={1.5}
          aria-hidden="true"
        />
      </div>
      <div className="pointer-events-none absolute top-1/2 left-1/2 z-30 h-1.5 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/30" />

      <div className="bg-page absolute inset-x-0 bottom-0 z-50 flex flex-col gap-2.5 rounded-t-[20px] px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-4px_18px_rgba(0,0,0,0.12)]">
        <h2 className="font-heading text-heading text-[18px] font-extrabold">
          {forumMapText.pickTitle[locale]}
        </h2>
        <p className="text-[13px] text-green-700">{forumMapText.pickHint[locale]}</p>
        <ul className="border-line divide-line divide-y overflow-hidden rounded-[14px] border bg-white">
          {nearby !== undefined && (
            <li>
              <button
                type="button"
                aria-pressed={withEntry}
                onClick={() => setUseEntry(true)}
                className="focus-visible:focus-surface hover:bg-quiet flex min-h-14 w-full cursor-pointer items-center gap-3 px-4 py-2 text-left"
              >
                <MapPin className="text-conveniat-green h-5 w-5 shrink-0" aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-semibold text-green-900">
                    {nearby.title}
                  </span>
                  <span className="text-[12px] text-green-700">
                    {forumMapText.entryDistance[locale].replace(
                      '{m}',
                      String(nearby.distanceMetres),
                    )}
                  </span>
                </span>
                {withEntry && (
                  <CheckCircle2 className="text-conveniat-green h-5 w-5" aria-hidden="true" />
                )}
              </button>
            </li>
          )}
          <li>
            <button
              type="button"
              aria-pressed={!withEntry}
              onClick={() => setUseEntry(false)}
              className="focus-visible:focus-surface hover:bg-quiet flex min-h-14 w-full cursor-pointer items-center gap-3 px-4 py-2 text-left"
            >
              <Crosshair className="text-conveniat-green h-5 w-5 shrink-0" aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-semibold text-green-900">
                  {forumMapText.exactlyHere[locale]}
                </span>
                <span className="text-[12px] text-green-700">
                  {forumMapText.withoutEntry[locale]}
                </span>
              </span>
              {!withEntry && (
                <CheckCircle2 className="text-conveniat-green h-5 w-5" aria-hidden="true" />
              )}
            </button>
          </li>
        </ul>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="bg-quiet hover:bg-chip focus-visible:focus-surface h-11 flex-1 cursor-pointer rounded-xl text-[15px] font-semibold text-green-900"
          >
            {forumMapText.cancel[locale]}
          </button>
          <button
            type="button"
            disabled={centre === undefined}
            onClick={() => {
              if (centre === undefined) return;
              router.replace(composerHrefFor(centre, withEntry ? nearby : undefined, topicId));
            }}
            className={cn(
              'bg-conveniat-green focus-visible:focus-surface-filled h-11 flex-[2] cursor-pointer rounded-xl text-[15px] font-semibold text-white hover:bg-green-700 disabled:opacity-50',
            )}
          >
            {forumMapText.useLocation[locale]}
          </button>
        </div>
      </div>
    </>
  );
};
