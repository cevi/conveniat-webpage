import { CeviLogo } from '@/components/svg-logos/cevi-logo';
import React from 'react';

/**
 * This component is used to fake the background of the admin panel to match the frontend.
 */
export const AdminPanelBackgroundFaker = (): React.JSX.Element => {
  return (
    <div className="fixed top-0 left-0 z-[-999] h-screen w-full bg-[#f8fafc] p-[56px]">
      <CeviLogo className="admin-panel-blur mx-auto h-full max-h-[60vh] w-full max-w-[384px] opacity-10" />
    </div>
  );
};
