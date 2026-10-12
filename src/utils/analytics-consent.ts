import { Cookie } from '@/types/types';
import Cookies from 'js-cookie';

/**
 * What a person answered when asked whether PostHog may record how they use the site.
 * `unanswered` is treated like `denied` everywhere except that the question is asked again.
 */
export type AnalyticsConsent = 'granted' | 'denied' | 'unanswered';

const CONSENT_CHANGED_EVENT = 'conveniat:analytics-consent-changed';
const CONSENT_LIFETIME_DAYS = 365;

/**
 * Reads the stored answer. Anything but the two known values counts as unanswered, so a
 * malformed cookie never turns analytics on.
 */
export const getAnalyticsConsent = (): AnalyticsConsent => {
  const value = Cookies.get(Cookie.ANALYTICS_CONSENT);
  return value === 'granted' || value === 'denied' ? value : 'unanswered';
};

/**
 * Stores the answer and tells this tab about it. Passing `unanswered` forgets the answer, which
 * stops analytics and makes the banner ask again.
 */
export const setAnalyticsConsent = (consent: AnalyticsConsent): void => {
  if (consent === 'unanswered') {
    Cookies.remove(Cookie.ANALYTICS_CONSENT);
  } else {
    Cookies.set(Cookie.ANALYTICS_CONSENT, consent, {
      expires: CONSENT_LIFETIME_DAYS,
      sameSite: 'lax',
    });
  }
  globalThis.dispatchEvent(new Event(CONSENT_CHANGED_EVENT));
};

/**
 * Calls the listener whenever the answer changes in this tab. Returns the unsubscribe function.
 */
export const subscribeToAnalyticsConsent = (listener: () => void): (() => void) => {
  globalThis.addEventListener(CONSENT_CHANGED_EVENT, listener);
  return (): void => globalThis.removeEventListener(CONSENT_CHANGED_EVENT, listener);
};
