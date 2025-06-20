'use client';

import { useDynamicAppTitle } from '@/components/header/dynamic-app-title-name';
import React, { useEffect } from 'react';

export const SetDynamicPageTitle: React.FC<{
  newTitle: string;
}> = ({ newTitle }) => {
  const { setDynamicAppTitle } = useDynamicAppTitle();
  useEffect(() => setDynamicAppTitle(newTitle), [newTitle, setDynamicAppTitle]);
  return <></>;
};
