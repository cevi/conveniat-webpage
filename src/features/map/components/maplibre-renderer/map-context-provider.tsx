import type maplibregl from 'maplibre-gl';
import React, { createContext, useContext } from 'react';

export const MapContext = createContext<maplibregl.Map | undefined>(undefined);

export const MapContextProvider: React.FC<{
  children: React.ReactNode;
  map: maplibregl.Map | null;
}> = ({ children, map }) => {
  return <MapContext.Provider value={map ?? undefined}>{children}</MapContext.Provider>;
};

export const useMap = (): maplibregl.Map | undefined => {
  return useContext(MapContext);
};
