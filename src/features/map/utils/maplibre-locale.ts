import type { Locale } from '@/types/types';

type MapLibreStrings = Record<string, string>;

/**
 * MapLibre's own labels, for the controls it draws and the hint on a map that needs two fingers.
 * Its defaults are English, which every screen reader read out on the German and French Karte.
 */
const strings: Record<Locale, MapLibreStrings> = {
  de: {
    'AttributionControl.ToggleAttribution': 'Quellenangaben ein- oder ausblenden',
    'AttributionControl.MapFeedback': 'Feedback zur Karte',
    'GeolocateControl.FindMyLocation': 'Mein Standort',
    'GeolocateControl.LocationNotAvailable': 'Standort nicht verfügbar',
    'Map.Title': 'Karte',
    'Marker.Title': 'Markierung',
    'NavigationControl.ResetBearing': 'Karte nach Norden ausrichten',
    'NavigationControl.ZoomIn': 'Vergrössern',
    'NavigationControl.ZoomOut': 'Verkleinern',
    'Popup.Close': 'Schliessen',
    'CooperativeGesturesHandler.WindowsHelpText':
      'Halte Ctrl gedrückt und scrolle, um die Karte zu zoomen',
    'CooperativeGesturesHandler.MacHelpText':
      'Halte ⌘ gedrückt und scrolle, um die Karte zu zoomen',
    'CooperativeGesturesHandler.MobileHelpText': 'Verschiebe die Karte mit zwei Fingern',
  },
  fr: {
    'AttributionControl.ToggleAttribution': 'Afficher ou masquer les sources',
    'AttributionControl.MapFeedback': 'Commentaires sur la carte',
    'GeolocateControl.FindMyLocation': 'Ma position',
    'GeolocateControl.LocationNotAvailable': 'Position non disponible',
    'Map.Title': 'Carte',
    'Marker.Title': 'Marqueur',
    'NavigationControl.ResetBearing': 'Orienter la carte vers le nord',
    'NavigationControl.ZoomIn': 'Zoomer',
    'NavigationControl.ZoomOut': 'Dézoomer',
    'Popup.Close': 'Fermer',
    'CooperativeGesturesHandler.WindowsHelpText':
      'Maintiens Ctrl et fais défiler pour zoomer sur la carte',
    'CooperativeGesturesHandler.MacHelpText':
      'Maintiens ⌘ et fais défiler pour zoomer sur la carte',
    'CooperativeGesturesHandler.MobileHelpText': 'Déplace la carte avec deux doigts',
  },
  en: {
    'AttributionControl.ToggleAttribution': 'Show or hide the sources',
    'AttributionControl.MapFeedback': 'Map feedback',
    'GeolocateControl.FindMyLocation': 'My location',
    'GeolocateControl.LocationNotAvailable': 'Location not available',
    'Map.Title': 'Map',
    'Marker.Title': 'Marker',
    'NavigationControl.ResetBearing': 'Point the map north',
    'NavigationControl.ZoomIn': 'Zoom in',
    'NavigationControl.ZoomOut': 'Zoom out',
    'Popup.Close': 'Close',
    'CooperativeGesturesHandler.WindowsHelpText': 'Hold Ctrl and scroll to zoom the map',
    'CooperativeGesturesHandler.MacHelpText': 'Hold ⌘ and scroll to zoom the map',
    'CooperativeGesturesHandler.MobileHelpText': 'Use two fingers to move the map',
  },
};

/** The labels for MapLibre's `locale` option. */
export const mapLibreLocaleOf = (locale: Locale): MapLibreStrings => strings[locale];
