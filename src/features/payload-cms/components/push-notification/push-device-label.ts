import type { PushNotificationSubscription } from '@/features/payload-cms/payload-types';
import type { Locale, StaticTranslationString } from '@/types/types';

/** How a device reads in the admin panel: what it is, and the version below it. */
export interface PushDeviceLabel {
  name: string;
  detail: string | undefined;
}

const nativeAppName: StaticTranslationString = {
  de: 'conveniat27-App',
  fr: 'App conveniat27',
  en: 'conveniat27 app',
};
const browserFallback: StaticTranslationString = { de: 'Browser', fr: 'Navigateur', en: 'Browser' };
const unknownSystem: StaticTranslationString = {
  de: 'unbekanntem System',
  fr: 'système inconnu',
  en: 'unknown system',
};
const onWord: StaticTranslationString = { de: 'auf', fr: 'sur', en: 'on' };

/** Checked in order: Edge, Opera and Samsung Internet also name Chrome, and Chrome names Safari. */
const BROWSERS: [RegExp, string][] = [
  [/EdgA?\/|Edg\//, 'Edge'],
  [/OPR\//, 'Opera'],
  [/SamsungBrowser\//, 'Samsung Internet'],
  [/Firefox\/|FxiOS\//, 'Firefox'],
  [/Chrome\/|CriOS\//, 'Chrome'],
  [/Safari\//, 'Safari'],
];

interface DeviceSystem {
  /** The word after "Chrome auf", like "Android" or "iPhone". */
  name: string;
  /** The system and its version, like "Android 14". */
  version: string | undefined;
}

const systemOf = (userAgent: string): DeviceSystem | undefined => {
  const android = /Android ([\d.]+)/.exec(userAgent);
  if (android) return { name: 'Android', version: `Android ${android[1]}` };
  const iosVersion = /iPhone OS ([\d_]+)/.exec(userAgent);
  if (iosVersion) return { name: 'iPhone', version: `iOS ${iosVersion[1]?.replaceAll('_', '.')}` };
  if (userAgent.includes('iPad')) return { name: 'iPad', version: undefined };
  if (userAgent.includes('CrOS')) return { name: 'ChromeOS', version: undefined };
  if (userAgent.includes('Windows')) return { name: 'Windows', version: undefined };
  if (userAgent.includes('Mac OS X')) return { name: 'macOS', version: undefined };
  if (userAgent.includes('Linux')) return { name: 'Linux', version: undefined };
  return undefined;
};

/**
 * Names a push device after what an admin would call it, "Chrome auf Android" rather than its
 * user agent. A native app registers no user agent, only its platform.
 */
export const describePushDevice = (
  device: Pick<PushNotificationSubscription, 'platform' | 'userAgent'>,
  locale: Locale,
): PushDeviceLabel => {
  if (device.platform !== 'web') {
    return {
      name: nativeAppName[locale],
      detail: device.platform === 'ios' ? 'iOS' : 'Android',
    };
  }

  const userAgent = device.userAgent ?? '';
  const browser =
    BROWSERS.find(([pattern]) => pattern.test(userAgent))?.[1] ?? browserFallback[locale];
  const system = systemOf(userAgent);
  return {
    name: `${browser} ${onWord[locale]} ${system?.name ?? unknownSystem[locale]}`,
    detail: system?.version,
  };
};
