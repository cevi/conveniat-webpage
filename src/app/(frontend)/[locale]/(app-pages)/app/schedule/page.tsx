import { SetDynamicPageTitle } from '@/components/header/set-dynamic-app-title';
import { ScheduleComponent } from '@/features/schedule/components/schedule-component';
import type React from 'react';

const SchedulePage: React.FC = () => {
  return (
    <>
      <SetDynamicPageTitle newTitle="Programm" />
      <ScheduleComponent />
    </>
  );
};

export default SchedulePage;
