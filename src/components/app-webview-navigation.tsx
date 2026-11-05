'use client';

import { useAppWebViewNavigate } from '@/hooks/use-app-webview-navigate';
import type React from 'react';

/** Lets the native app hand links to the open app page, see `useAppWebViewNavigate`. */
export const AppWebViewNavigation: React.FC = () => {
  useAppWebViewNavigate();
  return <></>;
};
