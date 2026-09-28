/**
 * Wrapper around location.assign() so consumers can be unit-tested (jsdom does
 * not implement navigation).
 */
export const assignLocation = (url: string): void => {
  globalThis.location.assign(url);
};
