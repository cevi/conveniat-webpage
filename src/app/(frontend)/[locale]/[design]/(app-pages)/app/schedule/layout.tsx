import type React from 'react';

interface ScheduleLayoutProperties {
  children: React.ReactNode;
  modal: React.ReactNode;
}

/**
 * Layout for schedule pages that supports intercepting routes.
 * The @modal slot is used for intercepted route navigation,
 * allowing the schedule list to remain visible while showing details.
 */
const ScheduleLayout: React.FC<ScheduleLayoutProperties> = ({ children, modal }) => {
  return (
    <>
      {children}
      {modal}
    </>
  );
};

export default ScheduleLayout;
