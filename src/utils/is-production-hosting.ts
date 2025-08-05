import { environmentVariables } from '@/config/environment-variables';

// check also is-development-build.ts -> isDevelopementBuild()
export const isProductionHosting = (): boolean => {
  return environmentVariables.NEXT_PUBLIC_APP_HOST_URL.includes('conveniat27.ch');
};
