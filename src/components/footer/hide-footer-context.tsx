'use client';

import React, { createContext, useContext, useState, type ReactNode } from 'react';

interface HideFooterContextValue {
  hideFooter: boolean;
  setHideFooter: (value: boolean) => void;
  hideCopyrightFooter: boolean;
  setHideCopyrightFooter: (value: boolean) => void;
}

const HideFooterContext = createContext<HideFooterContextValue | undefined>(undefined);

export const HideFooterProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [hideFooter, setHideFooter] = useState(false);
  const [hideCopyrightFooter, setHideCopyrightFooter] = useState(false);

  return (
    <HideFooterContext.Provider
      value={{ hideFooter, setHideFooter, hideCopyrightFooter, setHideCopyrightFooter }}
    >
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
export const AppFooterController: React.FC<{ hideAppFooter: boolean }> = ({ hideAppFooter }) => {
  const { setHideFooter } = useHideFooter();

  React.useEffect(() => {
    setHideFooter(hideAppFooter);
    return (): void => setHideFooter(false); // Reset on unmount
  }, [hideAppFooter, setHideFooter]);

  return <></>;
};

/**
 * Component to set the hide copyright footer state.
 * Place this in layouts where you want to hide the copyright footer.
 */
export const SetHideCopyrightFooter: React.FC<{ value: boolean }> = ({ value }) => {
  const { setHideCopyrightFooter } = useHideFooter();

  React.useEffect(() => {
    setHideCopyrightFooter(value);
    return (): void => setHideCopyrightFooter(false); // Reset on unmount
  }, [value, setHideCopyrightFooter]);

  return <></>;
};
