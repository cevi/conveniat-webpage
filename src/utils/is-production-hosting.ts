import { environmentVariables } from '@/config/environment-variables';

export const isProductionHosting = (): boolean => {
  return environmentVariables.NEXT_PUBLIC_APP_HOST_URL.includes('conveniat27.ch');
};
