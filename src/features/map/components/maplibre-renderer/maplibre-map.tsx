// This new component will consume the map from context and run the hooks
import { ceviLogoMarkerElementFactory } from '@/features/map/components/maplibre-renderer/map-renderer';
import { useAnnotationPointMarkers } from '@/features/map/hooks/use-annotation-point-markers';
import { useAnnotationPolygons } from '@/features/map/hooks/use-annotation-polygons';
import { useCeviLogoMarkers } from '@/features/map/hooks/use-cevi-logo-markers';
import { useFlyToAnnotation } from '@/features/map/hooks/use-fly-to-annotation';
import { useMapControls } from '@/features/map/hooks/use-map-controls';
import type {
  CampMapAnnotationPoint,
  CampMapAnnotationPolygon,
  CeviLogoMarker,
} from '@/features/map/types/types';
import type React from 'react';

export const MaplibreMap: React.FC<{
  openAnnotation: CampMapAnnotationPoint | CampMapAnnotationPolygon | undefined;
  setOpenAnnotation: React.Dispatch<
    React.SetStateAction<CampMapAnnotationPoint | CampMapAnnotationPolygon | undefined>
  >;
  campMapAnnotationPoints: CampMapAnnotationPoint[];
  campMapAnnotationPolygons: CampMapAnnotationPolygon[];
  ceviLogoMarkers: CeviLogoMarker[];
}> = ({
  openAnnotation,
  setOpenAnnotation,
  campMapAnnotationPoints,
  campMapAnnotationPolygons,
  ceviLogoMarkers,
}) => {
  useFlyToAnnotation(openAnnotation);
  useMapControls();
  useCeviLogoMarkers(ceviLogoMarkers, ceviLogoMarkerElementFactory);
  useAnnotationPointMarkers(campMapAnnotationPoints, openAnnotation, setOpenAnnotation);
  useAnnotationPolygons(campMapAnnotationPolygons, (annotation) => {
    setOpenAnnotation(annotation);
  });

  return <></>;
};
