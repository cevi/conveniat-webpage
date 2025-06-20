import { SetDynamicPageTitle } from '@/components/header/set-dynamic-app-title';
import { MapComponent } from '@/features/map/components/map-component';
import type React from 'react';

const MapPage: React.FC = () => {
  return (
    <>
      <SetDynamicPageTitle newTitle="Lagerplatz" />
      <MapComponent />
    </>
  );
};

export default MapPage;
