import { environmentVariables } from '@/config/environment-variables';

export const isDevelopementBuild = (): boolean => {
  try {
    return environmentVariables.NEXT_PUBLIC_APP_HOST_URL !== 'https://conveniat27.ch';
  } catch (error) {
    console.error('Error checking development build:', error);
    return false;
  }
};
