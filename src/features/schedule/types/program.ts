export interface ProgramEntry {
  id: string;
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
