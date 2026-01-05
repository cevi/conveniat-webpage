import type {
  CampMapAnnotation as CampMapAnnotationPayloadDocumentType,
  CampScheduleEntry as CampScheduleEntryPayloadDocumentType,
  Image,
} from '@/features/payload-cms/payload-types';

/**
 * Interface for the initial map pose.
 * This is used to define the initial center and zoom level of the map.
 */
export interface InitialMapPose {
  initialMapCenter: [number, number];
  zoom: number;
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

export interface CampScheduleEntry {
  id: string;
  title: string;
  description: CampScheduleEntryPayloadDocumentType['description'];
  timeslot: CampScheduleEntryPayloadDocumentType['timeslot'];
  location: {
    id: string;
  };
  organiser: (string | { fullName: string; email: string })[];
  participants_min: number;
  participants_max: number;
}

export interface CampMapAnnotationPoint {
  id: string;
  title: string;
  description: CampMapAnnotationPayloadDocumentType['description'];
  openingHours: CampMapAnnotationPayloadDocumentType['openingHours'];
  images: Image[];
  geometry: { coordinates: [number, number] };
  icon: 'MapPin' | 'Tent';
  color: string;
}

export interface CampMapAnnotationPolygon {
  id: string;
  title: string;
  description: CampMapAnnotationPayloadDocumentType['description'];
  openingHours: CampMapAnnotationPayloadDocumentType['openingHours'];
  images: Image[];
  geometry: { coordinates: [number, number][] };
  icon: 'MapPin' | 'Tent';
  color: string;
  isInteractive: boolean;
}

export interface MapControlOptions {
  showSearch?: boolean;
  showNavigation?: boolean;
  showGeolocate?: boolean;
  showScale?: boolean;
}
