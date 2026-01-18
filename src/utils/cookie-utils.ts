import type { Cookie } from '@/types/types';
import Cookies from 'js-cookie';

/**
 * Checks if a cookie exists and has a value of 'true'.
 * This is commonly used for boolean flags stored in cookies.
 *
 * @param cookieName - The name of the cookie to check (from Cookie enum or string)
 * @returns true if the cookie value is strictly 'true', false otherwise.
 */
export const isCookieTrue = (cookieName: Cookie | string): boolean => {
  return Cookies.get(cookieName) === 'true';
};

/**
 * Checks if a cookie is undefined (not set).
 *
 * @param cookieName - The name of the cookie to check
 * @returns true if the cookie is undefined, false otherwise.
 */
export const isCookieUnset = (cookieName: Cookie | string): boolean => {
  return Cookies.get(cookieName) === undefined;
};
