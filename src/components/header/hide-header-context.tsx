'use client';

import React, { createContext, useContext, useState, type ReactNode } from 'react';

interface HideHeaderContextValue {
  hideHeader: boolean;
  setHideHeader: (value: boolean) => void;
}

const HideHeaderContext = createContext<HideHeaderContextValue | undefined>(undefined);

export const HideHeaderProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [hideHeader, setHideHeader] = useState(false);

  return (
    <HideHeaderContext.Provider value={{ hideHeader, setHideHeader }}>
      {children}
    </HideHeaderContext.Provider>
  );
};

export const useHideHeader = (): HideHeaderContextValue => {
  const context = useContext(HideHeaderContext);
  if (!context) {
    throw new Error('useHideHeader must be used within a HideHeaderProvider');
  }
  return context;
};

/**
 * Component to set the hide header state.
 * Place this in layouts where you want to hide the header.
 */
export const SetHideHeader: React.FC<{ value: boolean }> = ({ value }) => {
  const { setHideHeader } = useHideHeader();

  React.useEffect(() => {
    setHideHeader(value);
    return (): void => setHideHeader(false); // Reset on unmount
  }, [value, setHideHeader]);

  return <></>;
};
