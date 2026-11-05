// This new component will consume the map from context and run the hooks
import { useAnnotationPointMarkers } from '@/components/map/hooks/use-annotation-point-markers';
import { useAnnotationPolygons } from '@/components/map/hooks/use-annotation-polygons';
import { useCeviLogoMarkers } from '@/components/map/hooks/use-cevi-logo-markers';
import { useFlyToAnnotation } from '@/components/map/hooks/use-fly-to-annotation';
import { useMapControls } from '@/components/map/hooks/use-map-controls';
import { ceviLogoMarkerElementFactory } from '@/components/map/maplibre-renderer/map-renderer';
import type {
  CampMapAnnotationPoint,
  CampMapAnnotationPolygon,
  CeviLogoMarker,
  MapControlOptions,
} from '@/components/map/types';
import type React from 'react';

export const MaplibreMap: React.FC<{
  openAnnotation: CampMapAnnotationPoint | CampMapAnnotationPolygon | undefined;
  setOpenAnnotation: React.Dispatch<
    React.SetStateAction<CampMapAnnotationPoint | CampMapAnnotationPolygon | undefined>
  >;
  campMapAnnotationPoints: CampMapAnnotationPoint[];
  campMapAnnotationPolygons: CampMapAnnotationPolygon[];
  ceviLogoMarkers: CeviLogoMarker[];
  mapControlOptions?: MapControlOptions | undefined;
  disableFlyTo?: boolean;
}> = ({
  openAnnotation,
  setOpenAnnotation,
  campMapAnnotationPoints,
  campMapAnnotationPolygons,
  ceviLogoMarkers,
  mapControlOptions,
  disableFlyTo = false,
}) => {
  useFlyToAnnotation(openAnnotation, !disableFlyTo);
  useMapControls(mapControlOptions);
  useCeviLogoMarkers(ceviLogoMarkers, ceviLogoMarkerElementFactory);
  useAnnotationPointMarkers(campMapAnnotationPoints, openAnnotation, setOpenAnnotation);
  useAnnotationPolygons(campMapAnnotationPolygons, openAnnotation, setOpenAnnotation);

  return <></>;
};
