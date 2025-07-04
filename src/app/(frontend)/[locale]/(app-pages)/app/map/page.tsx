import { SetDynamicPageTitle } from '@/components/header/set-dynamic-app-title';
import { CampMapComponent } from '@/features/map/components/camp-map-component';
import type React from 'react';

const MapPage: React.FC = () => {
  return (
    <>
      <SetDynamicPageTitle newTitle="Lagerplatz" />
      <CampMapComponent />
    </>
  );
};

export default MapPage;
