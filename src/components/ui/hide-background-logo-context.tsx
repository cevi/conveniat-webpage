'use client';

import React, { createContext, useContext, useState, type ReactNode } from 'react';

interface HideBackgroundLogoContextValue {
  hideBackgroundLogo: boolean;
  setHideBackgroundLogo: (value: boolean) => void;
}

const HideBackgroundLogoContext = createContext<HideBackgroundLogoContextValue | undefined>(undefined);

export const HideBackgroundLogoProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [hideBackgroundLogo, setHideBackgroundLogo] = useState(false);

  return (
    <HideBackgroundLogoContext.Provider value={{ hideBackgroundLogo, setHideBackgroundLogo }}>
      {children}
    </HideBackgroundLogoContext.Provider>
  );
};

export const useHideBackgroundLogo = (): HideBackgroundLogoContextValue => {
  const context = useContext(HideBackgroundLogoContext);
  if (!context) {
    throw new Error('useHideBackgroundLogo must be used within a HideBackgroundLogoProvider');
  }
  return context;
};

/**
 * Component to set the hide background logo state.
 * Place this in layouts or pages where you want to hide the background logo.
 */
export const SetHideBackgroundLogo: React.FC<{ value: boolean }> = ({ value }) => {
  const { setHideBackgroundLogo } = useHideBackgroundLogo();

  React.useEffect(() => {
    setHideBackgroundLogo(value);
    return (): void => setHideBackgroundLogo(false); // Reset on unmount
  }, [value, setHideBackgroundLogo]);

  return <></>;
};
