import { SetDynamicPageTitle } from '@/components/header/set-dynamic-app-title';
import { EmergencyComponent } from '@/features/emergency/components/emergency-component';
import { TRPCProvider } from '@/trpc/client';
import type React from 'react';

const EmergencyPage: React.FC = () => {
  return (
    <>
      <TRPCProvider>
        <SetDynamicPageTitle newTitle="Notfall" />
        <EmergencyComponent />
      </TRPCProvider>
    </>
  );
};

export default EmergencyPage;
