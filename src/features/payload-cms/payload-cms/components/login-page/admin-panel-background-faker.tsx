import { BackgroundLogo } from '@/components/background-logo';
import React from 'react';

/**
 * This component is used to fake the background of the admin panel to match the frontend.
 */
export const AdminPanelBackgroundFaker = ({
  hideLogo = false,
}: {
  hideLogo?: boolean;
}): React.JSX.Element => {
  return (
    <div className="fixed top-0 left-0 z-[-999] flex h-screen w-full items-center justify-center bg-[#f8fafc] p-[56px]">
      {!hideLogo && <BackgroundLogo />}
    </div>
  );
};
