import React from 'react';
import type { InitialMapPose } from '@/features/map/components/map-renderer';
import { MapLibreRenderer } from '@/features/map/components/map-renderer';

const initialMapPoseObergoms: InitialMapPose = {
  initialMapCenter: [8.301_211, 46.502_822],
  zoom: 15.5,
};

export const MapComponent: React.FC = async () => {
  return (
    <div className="fixed left-0 top-[60px] h-[calc(100dvh-60px)] w-screen pb-20">
      <MapLibreRenderer
        initialMapPose={initialMapPoseObergoms}
        ceviLogoMarkers={[]}
        validateStyle={process.env.NODE_ENV !== 'production'}
      />
    </div>
  );
};
