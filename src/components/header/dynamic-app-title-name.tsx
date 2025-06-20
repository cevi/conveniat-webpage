'use client';

import type { ReactNode } from 'react';
import React, { createContext, useContext, useState } from 'react';

interface DynamicAppTitleContextType {
  dynamicAppTitle: string;
  setDynamicAppTitle: (title: string) => void;
}

const AppTitleContext = createContext<DynamicAppTitleContextType>({
  dynamicAppTitle: 'conveniat27',
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
  initialAppTitle = 'conveniat27',
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
