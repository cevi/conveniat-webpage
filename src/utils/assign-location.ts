/**
 * Wrapper around location.assign() so consumers can be unit-tested (jsdom does
 * not implement navigation).
 */
export const assignLocation = (url: string): void => {
  globalThis.location.assign(url);
};

/** Wrapper around location.replace(), for the same reason. */
export const replaceLocation = (url: string): void => {
  globalThis.location.replace(url);
};
