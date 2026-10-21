import { SetHideBackgroundLogo } from '@/components/ui/hide-background-logo-context';
import type React from 'react';

interface ScheduleLayoutProperties {
  children: React.ReactNode;
}

/**
 * Layout for the schedule pages. The blurred background mark stays off here: the timeline is
 * drawn on the bare page, and the mark would show through between its rows.
 */
const ScheduleLayout: React.FC<ScheduleLayoutProperties> = ({ children }) => {
  return (
    <>
      <SetHideBackgroundLogo value />
      {children}
    </>
  );
};

export default ScheduleLayout;
