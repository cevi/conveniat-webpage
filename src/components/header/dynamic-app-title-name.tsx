'use client';

import type { ReactNode } from 'react';
import React, { createContext, useContext, useState } from 'react';

/**
 * The title of a page that has no name of its own in the header, such as a page of the website:
 * the camp's name.
 */
export const DEFAULT_APP_TITLE = 'conveniat27';

interface DynamicAppTitleContextType {
  dynamicAppTitle: string;
  setDynamicAppTitle: (title: string) => void;
}

const AppTitleContext = createContext<DynamicAppTitleContextType>({
  dynamicAppTitle: DEFAULT_APP_TITLE,
  setDynamicAppTitle: () => {
    console.warn('setDynamicAppTitle was called without a provider');
  },
});

interface ChatIdProviderProperties {
  children: ReactNode;
  initialAppTitle?: string;
}

export const DynamicAppTitleProvider: React.FC<ChatIdProviderProperties> = ({
  children,
  initialAppTitle = DEFAULT_APP_TITLE,
}) => {
  const [dynamicAppTitle, setDynamicAppTitle] = useState<string>(initialAppTitle);
  return (
    <AppTitleContext.Provider value={{ dynamicAppTitle, setDynamicAppTitle }}>
      {children}
    </AppTitleContext.Provider>
  );
};

export const useDynamicAppTitle = (): {
  dynamicAppTitle: string;
  setDynamicAppTitle: (newAppTitle: string) => void;
} => {
  const context = useContext(AppTitleContext);
  return {
    dynamicAppTitle: context.dynamicAppTitle,
    setDynamicAppTitle: context.setDynamicAppTitle,
  };
};

export const DynamicAppTitleName: React.FC = () => {
  const { dynamicAppTitle } = useDynamicAppTitle();
  return <>{dynamicAppTitle}</>;
};
