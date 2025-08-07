import { SetDynamicPageTitle } from '@/components/header/set-dynamic-app-title';
import { getScheduleEntries } from '@/features/schedule/api/get-schedule-entries';
import { ScheduleComponent } from '@/features/schedule/components/schedule-component';
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
