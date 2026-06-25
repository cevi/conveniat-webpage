import { useEffect, useState } from 'react';

export interface NativeAppInfo {
  version: string;
  buildNumber: string;
  platform: string;
}

declare global {
  interface Window {
    AppWebViewNativeApp?: NativeAppInfo;
  }
  var AppWebViewNativeApp: NativeAppInfo | undefined;
}

/**
 * Hook to retrieve native app version, platform, and build number
 * exposed by the native app wrapper.
 */
export const useNativeAppInfo = (): NativeAppInfo | undefined => {
  const [nativeAppInfo, setNativeAppInfo] = useState<NativeAppInfo | undefined>();

  useEffect(() => {
    if (
      typeof globalThis !== 'undefined' &&
      globalThis.AppWebViewNativeApp &&
      typeof globalThis.AppWebViewNativeApp.version === 'string' &&
      globalThis.AppWebViewNativeApp.version.trim() !== '' &&
      typeof globalThis.AppWebViewNativeApp.buildNumber === 'string' &&
      globalThis.AppWebViewNativeApp.buildNumber.trim() !== '' &&
      typeof globalThis.AppWebViewNativeApp.platform === 'string' &&
      globalThis.AppWebViewNativeApp.platform.trim() !== ''
    ) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setNativeAppInfo(globalThis.AppWebViewNativeApp);
    }
  }, []);

  return nativeAppInfo;
};
