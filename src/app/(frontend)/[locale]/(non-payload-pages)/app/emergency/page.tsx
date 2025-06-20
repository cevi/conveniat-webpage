import { SetDynamicPageTitle } from '@/components/header/set-dynamic-app-title';
import { EmergencyComponent } from '@/features/emergency/components/emergency-component';
import type React from 'react';

const EmergencyPage: React.FC = () => {
  return (
    <>
      <SetDynamicPageTitle newTitle="Notfall" />
      <EmergencyComponent />
    </>
  );
};

export default EmergencyPage;
