'use client';

import { useReloadWhenOnline } from '@/hooks/use-reload-when-online';
import type React from 'react';

/** Loads the page the user wanted as soon as the connection returns. */
export const ReloadWhenOnline: React.FC = () => {
  useReloadWhenOnline();
  return <></>;
};
