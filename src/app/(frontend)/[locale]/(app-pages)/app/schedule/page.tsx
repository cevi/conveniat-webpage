import { SetDynamicPageTitle } from '@/components/header/set-dynamic-app-title';
import { ScheduleComponent } from '@/features/schedule/components/schedule-component';
import { getScheduleEntries } from '@/features/schedule/components/schedule-component-server';
import type React from 'react';

const SchedulePage: React.FC = async () => {
  return (
    <>
      <SetDynamicPageTitle newTitle="Programm" />
      <ScheduleComponent scheduleEntries={await getScheduleEntries()} />
    </>
  );
};

export default SchedulePage;
