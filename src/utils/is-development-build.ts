import { environmentVariables } from '@/config/environment-variables';

export const isDevelopementBuild = (): boolean => {
  return environmentVariables.NEXT_PUBLIC_APP_HOST_URL !== 'https://conveniat27.ch';
};
