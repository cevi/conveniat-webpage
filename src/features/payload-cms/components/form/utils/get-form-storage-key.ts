import { environmentVariables } from '@/config/environment-variables';

export function getFormStorageKey(formId: string, type: 'state' | 'step' | 'prefill'): string {
  const envPrefix = environmentVariables.NEXT_PUBLIC_APP_HOST_URL;
  return `form_${type}_${envPrefix}_${formId}`;
}
