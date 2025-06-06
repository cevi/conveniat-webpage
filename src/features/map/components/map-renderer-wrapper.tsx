'use client';

import type { CeviLogoMarker, InitialMapPose } from '@/features/map/components/types';
import dynamic from 'next/dynamic';
import type React from 'react';

const LazyMapLibreRenderer = dynamic(() => import('@/features/map/components/map-renderer'), {
  ssr: false,
});

/***
 * This component is a wrapper for the MapLibreRenderer that allows for dynamic loading. This
 * helps to reduce the bundle size and improve performance by loading the map renderer only when it is necessary.
 *
 *
 * It accepts initial map pose, Cevi logo markers, and options for limiting usage and validating style.
 *
 * @param initialMapPose
 * @param ceviLogoMarkers
 * @param limitUsage
 * @param validateStyle
 * @constructor
 */
export const MapLibreRenderer = ({
  initialMapPose,
  ceviLogoMarkers,
  limitUsage = true,
  validateStyle = true,
}: {
  initialMapPose: InitialMapPose;
  ceviLogoMarkers: CeviLogoMarker[];
  limitUsage?: boolean;
  validateStyle?: boolean;
}): React.JSX.Element => {
  return (
    <LazyMapLibreRenderer
      initialMapPose={initialMapPose}
      ceviLogoMarkers={ceviLogoMarkers}
      limitUsage={limitUsage}
      validateStyle={validateStyle}
    />
  );
};
