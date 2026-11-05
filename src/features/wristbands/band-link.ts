/** `/tag/{uid}`, also with a locale in front: the link a band carries, see `WRISTBAND_URL_TEMPLATE`. */
const BAND_PATH = /^\/(?:[a-z]{2}\/)?tag\/([0-9A-Fa-f]{14})\/?$/;

/** Whether a link the native app hands over is a tapped band. */
export const isBandLink = (target: URL): boolean => BAND_PATH.test(target.pathname);

/** The UID of the band a link stands for, in upper case, or undefined for any other link. */
export const bandUidOf = (target: URL): string | undefined =>
  BAND_PATH.exec(target.pathname)?.[1]?.toUpperCase();
