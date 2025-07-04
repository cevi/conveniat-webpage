import { SetDynamicPageTitle } from '@/components/header/set-dynamic-app-title';
import type React from 'react';

const EmergencyPage: React.FC = () => {
  return (
    <>
      <SetDynamicPageTitle newTitle="Helper Portal" />
    </>
  );
};

export default EmergencyPage;
