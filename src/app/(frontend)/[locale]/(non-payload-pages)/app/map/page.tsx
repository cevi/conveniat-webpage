import React from 'react';
import { InitialMapPose, MapLibreRenderer } from '@/components/map-viewer/map-renderer';

const initialMapPoseObergoms: InitialMapPose = {
  initialMapCenter: [8.301_211, 46.502_822],
  zoom: 15.5,
};

const MapPage: React.FC = async () => {
  return (
    <div className="fixed left-0 top-[60px] h-[calc(100dvh-60px)] w-screen pb-20">
      <MapLibreRenderer initialMapPose={initialMapPoseObergoms} ceviLogoMarkers={[]} />
    </div>
  );
};

export default MapPage;
