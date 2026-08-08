/**
 * Wrapper around location.reload() so consumers can be unit-tested (jsdom does
 * not implement navigation).
 */
export const reloadPage = (): void => {
  globalThis.location.reload();
};
