import type React from 'react';

interface ScheduleLayoutProperties {
  children: React.ReactNode;
}

/**
 * Simple layout for schedule pages.
 */
const ScheduleLayout: React.FC<ScheduleLayoutProperties> = ({ children }) => {
  return <>{children}</>;
};

export default ScheduleLayout;
