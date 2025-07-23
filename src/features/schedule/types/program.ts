export interface ProgramEntry {
  id: number;
  title: string;
  time: string;
  location: string;
  details: string;
  fullDescription?: string;
  mapCoordinates?: {
    x: number;
    y: number;
  };
  locationId?: string;
}
