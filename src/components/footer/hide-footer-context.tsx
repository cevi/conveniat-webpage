'use client';

import React, { createContext, useContext, useState, type ReactNode } from 'react';

interface HideFooterContextValue {
  hideFooter: boolean;
  setHideFooter: (value: boolean) => void;
}

const HideFooterContext = createContext<HideFooterContextValue | undefined>(undefined);

export const HideFooterProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [hideFooter, setHideFooter] = useState(false);

  return (
    <HideFooterContext.Provider value={{ hideFooter, setHideFooter }}>
      {children}
    </HideFooterContext.Provider>
  );
};

export const useHideFooter = (): HideFooterContextValue => {
  const context = useContext(HideFooterContext);
  if (!context) {
    throw new Error('useHideFooter must be used within a HideFooterProvider');
  }
  return context;
};

/**
 * Component to set the hide footer state.
 * Place this in layouts where you want to hide the footer.
 */
export const SetHideFooter: React.FC<{ value: boolean }> = ({ value }) => {
  const { setHideFooter } = useHideFooter();

  React.useEffect(() => {
    setHideFooter(value);
    return (): void => setHideFooter(false); // Reset on unmount
  }, [value, setHideFooter]);

  return <></>;
};
