import type {
  CampMapAnnotation as CampMapAnnotationPayloadDocumentType,
  Image,
} from '@/features/payload-cms/payload-types';

/**
 * Interface for the initial map pose.
 * This is used to define the initial center, zoom level and rotation of the map.
 */
export interface InitialMapPose {
  initialMapCenter: [number, number];
  zoom: number;
  /** Rotation in degrees clockwise from north. North up when omitted. */
  bearing?: number;
}

/**
 * Interface for a Cevi Logo Marker.
 */
export interface CeviLogoMarker {
  geometry: {
    coordinates: [number, number];
  };
  title: string;
}

/** The Quartier an area belongs to: "Quartier 7 - Phoenix", number 7, Rufname "Phoenix". */
export interface MapQuartier {
  name: string;
  number?: number | undefined;
  rufname?: string | undefined;
}

export interface CampMapAnnotationPoint {
  id: string;
  title: string;
  description: CampMapAnnotationPayloadDocumentType['description'];
  openingHours: CampMapAnnotationPayloadDocumentType['openingHours'];
  images: Image[];
  geometry: { coordinates: [number, number] };
  icon: CampMapAnnotationPayloadDocumentType['icon'];
  color: string;
  importance: 'high' | 'medium' | 'low';
  enableSupportChat?: boolean;
  hiddenOnDefaultMap?: boolean;
  /** Whether the title is rendered next to the marker once the map is zoomed in. */
  showLabel?: boolean;
  /** the Quartier whose area this is; absent for the other places and in an older copy */
  quartier?: MapQuartier | undefined;
}

export interface CampMapAnnotationPolygon {
  id: string;
  title: string;
  description: CampMapAnnotationPayloadDocumentType['description'];
  openingHours: CampMapAnnotationPayloadDocumentType['openingHours'];
  images: Image[];
  geometry: { coordinates: [number, number][] };
  icon: CampMapAnnotationPayloadDocumentType['icon'];
  color: string;
  isInteractive: boolean;
  importance: 'high' | 'medium' | 'low';
  enableSupportChat?: boolean;
  hiddenOnDefaultMap?: boolean;
  /** the Quartier whose area this is; absent for the other places and in an older copy */
  quartier?: MapQuartier | undefined;
}

export interface MapControlOptions {
  showSearch?: boolean;
  showNavigation?: boolean;
  showGeolocate?: boolean;
  showScale?: boolean;
}
