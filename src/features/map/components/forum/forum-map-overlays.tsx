'use client';

import { BottomSheet } from '@/components/ui/bottom-sheet';
import { ForumLocationPicker } from '@/features/map/components/forum/forum-location-picker';
import { forumMapText } from '@/features/map/components/forum/forum-map-texts';
import { useMap } from '@/features/map/components/maplibre-renderer/map-context-provider';
import type { CampMapAnnotationPoint, CampMapAnnotationPolygon } from '@/features/map/types/types';
import { composerHrefFor, findNearestAnnotation } from '@/features/map/utils/nearest-annotation';
import { useAuthStatus } from '@/hooks/use-auth-status';
import { useCurrentLocale } from '@/hooks/use-current-locale';
import { distanceInMetres, forumStatusLabel, type ForumPostSummary } from '@/lib/forum-shared';
import { trpc } from '@/trpc/client';
import type { Locale } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { ChevronRight, Flag, X } from 'lucide-react';
import {
  Marker,
  type Map as MaplibreMap,
  type MapMouseEvent,
  type MapTouchEvent,
} from 'maplibre-gl';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { useEffect, useMemo, useState } from 'react';

const LAYER_STORAGE_KEY = 'conveniat:map-forum-layer';
const LONG_PRESS_MS = 550;
/** posts closer than this share one marker */
const CLUSTER_METRES = 15;

interface Cluster {
  key: string;
  coordinates: [number, number];
  posts: ForumPostSummary[];
}

const clusterPosts = (posts: readonly ForumPostSummary[]): Cluster[] => {
  const clusters: Cluster[] = [];
  for (const post of posts) {
    if (post.location === null) continue;
    const { longitude, latitude } = post.location;
    const near = clusters.find(
      (cluster) =>
        distanceInMetres(
          { longitude: cluster.coordinates[0], latitude: cluster.coordinates[1] },
          { longitude, latitude },
        ) <= CLUSTER_METRES,
    );
    if (near === undefined) {
      clusters.push({ key: post.id, coordinates: [longitude, latitude], posts: [post] });
    } else {
      near.posts.push(post);
    }
  }
  return clusters;
};

/** Whether the forum is on for this deployment and the user can use it: signed in. */
const useForumAvailable = (locale: Locale): boolean => {
  const status = useAuthStatus();
  const { data } = trpc.appContent.getDashboardConfig.useQuery({ locale });
  return status === 'authenticated' && data?.featureFlags.forumEnabled !== false;
};

/** The open posts with a place, as count markers; a tap opens the posts of that spot. */
const useForumMarkers = (
  map: MaplibreMap | undefined,
  clusters: readonly Cluster[],
  onOpen: (cluster: Cluster) => void,
): void => {
  useEffect(() => {
    if (map === undefined) return;
    const markers = clusters.map((cluster) => {
      const element = document.createElement('button');
      element.type = 'button';
      element.className =
        'flex h-7 min-w-7 cursor-pointer items-center justify-center rounded-full border-2 border-[#47564C] bg-white px-1.5 text-[12px] font-extrabold text-[#47564C] shadow-[0_1px_4px_rgba(0,0,0,0.25)]';
      element.textContent = String(cluster.posts.length);
      element.setAttribute(
        'aria-label',
        `${cluster.posts.length} ${cluster.posts[0]?.title ?? ''}`,
      );
      element.addEventListener('click', (event) => {
        event.stopPropagation();
        onOpen(cluster);
      });
      return new Marker({ element }).setLngLat(cluster.coordinates).addTo(map);
    });
    return (): void => {
      for (const marker of markers) marker.remove();
    };
  }, [map, clusters, onOpen]);
};

/**
 * A long press on the map, or a right click on a desktop, hands the spot to `onPress`. A press
 * that moves is a pan, not a press.
 */
const useLongPress = (
  map: MaplibreMap | undefined,
  onPress: (spot: [number, number], screen: { x: number; y: number }) => void,
): void => {
  useEffect(() => {
    if (map === undefined) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const cancel = (): void => {
      if (timer !== undefined) clearTimeout(timer);
      timer = undefined;
    };
    const onTouchStart = (event: MapTouchEvent): void => {
      cancel();
      if (event.points.length !== 1) return;
      const { lngLat, point } = event;
      timer = setTimeout(() => {
        onPress([lngLat.lng, lngLat.lat], { x: point.x, y: point.y });
      }, LONG_PRESS_MS);
    };
    const onContextMenu = (event: MapMouseEvent): void => {
      event.preventDefault();
      onPress([event.lngLat.lng, event.lngLat.lat], { x: event.point.x, y: event.point.y });
    };
    map.on('touchstart', onTouchStart);
    map.on('touchend', cancel);
    map.on('touchcancel', cancel);
    map.on('touchmove', cancel);
    map.on('movestart', cancel);
    map.on('contextmenu', onContextMenu);
    return (): void => {
      cancel();
      map.off('touchstart', onTouchStart);
      map.off('touchend', cancel);
      map.off('touchcancel', cancel);
      map.off('touchmove', cancel);
      map.off('movestart', cancel);
      map.off('contextmenu', onContextMenu);
    };
  }, [map, onPress]);
};

/** A layer toggle remembered on the device, on by default. */
const useLayerToggle = (): [boolean, () => void] => {
  const [shown, setShown] = useState(true);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read once from the device
    setShown(localStorage.getItem(LAYER_STORAGE_KEY) !== 'off');
  }, []);
  const toggle = (): void => {
    setShown((previous) => {
      localStorage.setItem(LAYER_STORAGE_KEY, previous ? 'off' : 'on');
      return !previous;
    });
  };
  return [shown, toggle];
};

/** Opens the posts of the spot a link names, `?forumPost=<id>`, once the map is there. */
const useForumPostDeepLink = (
  map: MaplibreMap | undefined,
  clusters: readonly Cluster[],
  onOpen: (cluster: Cluster) => void,
): void => {
  const postId = useSearchParams().get('forumPost');
  const [handled, setHandled] = useState<string | undefined>();
  const { data } = trpc.forum.getForumPost.useQuery(
    { postId: postId ?? '' },
    { enabled: postId !== null && /^[\da-f-]{36}$/i.test(postId) },
  );
  useEffect(() => {
    if (map === undefined || data?.location == undefined || handled === data.id) return;
    const coordinates: [number, number] = [data.location.longitude, data.location.latitude];
    map.flyTo({ center: coordinates, zoom: Math.max(map.getZoom(), 17) });
    const cluster = clusters.find((candidate) =>
      candidate.posts.some((post) => post.id === data.id),
    ) ?? { key: data.id, coordinates, posts: [data] };
    // eslint-disable-next-line react-hooks/set-state-in-effect -- once per linked post
    setHandled(data.id);
    onOpen(cluster);
  }, [map, data, clusters, handled, onOpen]);
};

/**
 * The forum on the camp map: the open reports as a layer, a long press to report a spot, the
 * spot picker of the composer (`?pickForum=1`), and links to a post's spot (`?forumPost=`).
 * Only for a signed-in user where the forum is on; the map itself stays public.
 */
export const ForumMapOverlays: React.FC<{
  annotationPoints: readonly CampMapAnnotationPoint[];
  annotationPolygons: readonly CampMapAnnotationPolygon[];
}> = ({ annotationPoints, annotationPolygons }) => {
  const locale = useCurrentLocale(i18nConfig) as Locale;
  const map = useMap();
  const router = useRouter();
  const parameters = useSearchParams();
  const isPicking = parameters.get('pickForum') === '1';
  const topicId = parameters.get('topic');
  const available = useForumAvailable(locale);
  const [shown, toggleShown] = useLayerToggle();
  const [openCluster, setOpenCluster] = useState<Cluster | undefined>();
  const [pressed, setPressed] = useState<
    { spot: [number, number]; screen: { x: number; y: number } } | undefined
  >();

  const { data } = trpc.forum.getForumPostMapList.useQuery({}, { enabled: available });
  const clusters = useMemo(
    () => (shown && !isPicking ? clusterPosts(Array.isArray(data) ? data : []) : []),
    [data, shown, isPicking],
  );
  const open = useMemo(
    () =>
      (cluster: Cluster): void =>
        setOpenCluster(cluster),
    [],
  );
  const press = useMemo(
    () =>
      (spot: [number, number], screen: { x: number; y: number }): void =>
        setPressed({ spot, screen }),
    [],
  );

  useForumMarkers(available ? map : undefined, clusters, open);
  useLongPress(available && !isPicking ? map : undefined, press);
  useForumPostDeepLink(available ? map : undefined, clusters, open);

  if (!available) return <></>;
  if (isPicking) {
    return (
      <ForumLocationPicker
        annotationPoints={annotationPoints}
        annotationPolygons={annotationPolygons}
        topicId={topicId}
      />
    );
  }

  const pressedAnnotation =
    pressed === undefined
      ? undefined
      : findNearestAnnotation(pressed.spot, annotationPoints, annotationPolygons);

  return (
    <>
      <button
        type="button"
        onClick={toggleShown}
        aria-pressed={shown}
        aria-label={shown ? forumMapText.layerOn[locale] : forumMapText.layerOff[locale]}
        title={shown ? forumMapText.layerOn[locale] : forumMapText.layerOff[locale]}
        className={cn(
          'absolute top-[calc(4.5rem+var(--app-logo-overhang,0px))] right-4 z-40 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full shadow-[0_2px_10px_rgba(0,0,0,0.15)]',
          shown
            ? 'bg-conveniat-green focus-visible:focus-surface-filled text-white'
            : 'hover:bg-quiet focus-visible:focus-surface bg-white text-green-900',
        )}
      >
        <Flag className="h-5 w-5" aria-hidden="true" />
      </button>

      {pressed !== undefined && (
        <div
          className="border-line absolute z-40 flex w-60 -translate-x-1/2 flex-col rounded-[14px] border bg-white p-1 shadow-[0_6px_18px_rgba(0,0,0,0.18)]"
          style={{ left: pressed.screen.x, top: pressed.screen.y + 12 }}
        >
          <button
            type="button"
            onClick={() => {
              router.push(composerHrefFor(pressed.spot, pressedAnnotation, topicId));
              setPressed(undefined);
            }}
            className="focus-visible:focus-surface hover:bg-quiet flex min-h-11 cursor-pointer items-center gap-2 rounded-xl px-3 text-left text-[14px] font-semibold text-green-900"
          >
            <Flag className="text-conveniat-green h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="min-w-0">
              {forumMapText.reportHere[locale]}
              {pressedAnnotation !== undefined && (
                <span className="block truncate text-[12px] font-normal text-green-700">
                  {pressedAnnotation.title}
                </span>
              )}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setPressed(undefined)}
            aria-label={forumMapText.closeMenu[locale]}
            className="focus-visible:focus-surface hover:bg-quiet border-line absolute -top-3 -right-3 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border bg-white text-green-800"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}

      <BottomSheet
        open={openCluster !== undefined}
        onOpenChange={(next) => !next && setOpenCluster(undefined)}
        title={forumMapText.reportsHere[locale]}
      >
        <ul className="border-line divide-line mb-3 divide-y overflow-hidden rounded-[14px] border bg-white">
          {openCluster?.posts.map((post) => (
            <li key={post.id}>
              <Link
                href={`/app/forum/${post.id}`}
                className="focus-visible:focus-surface hover:bg-quiet flex min-h-14 items-center gap-3 px-4 py-2.5"
              >
                <span className="min-w-0 flex-1">
                  <span className="text-heading block truncate text-[15px] font-semibold">
                    {post.title}
                  </span>
                  <span className="text-[12px] text-green-700">
                    {forumStatusLabel[post.status][locale]} · {post.likeCount} 👍 ·{' '}
                    {post.commentCount} 💬
                  </span>
                </span>
                <ChevronRight className="h-5 w-5 text-green-500" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
        {openCluster !== undefined && (
          <Link
            href={composerHrefFor(
              openCluster.coordinates,
              findNearestAnnotation(openCluster.coordinates, annotationPoints, annotationPolygons),
              topicId,
            )}
            className="focus-visible:focus-surface border-rail hover:bg-quiet mb-2 flex h-11 items-center justify-center rounded-xl border bg-white text-[15px] font-semibold text-green-900"
          >
            {forumMapText.otherProblem[locale]}
          </Link>
        )}
      </BottomSheet>
    </>
  );
};
