'use client';

import { useNativeAppInfo } from '@/hooks/use-native-app-info';
import React from 'react';

/**
 * Renders the native app version if available, formatted for append display
 * next to the PWA version (e.g. " (Android 1.2.3)").
 */
export const NativeAppVersionInfo: React.FC = () => {
  const nativeApp = useNativeAppInfo();

  if (!nativeApp) return;

  let platformName = nativeApp.platform;
  if (nativeApp.platform.toLowerCase() === 'ios') {
    platformName = 'iOS';
  } else if (nativeApp.platform.toLowerCase() === 'android') {
    platformName = 'Android';
  }

  return (
    <>
      {' '}
      ({platformName} {nativeApp.version})
    </>
  );
};
