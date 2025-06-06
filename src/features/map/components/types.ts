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
