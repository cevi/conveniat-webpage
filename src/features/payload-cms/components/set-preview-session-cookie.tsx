'use client';

import { environmentVariables } from '@/config/environment-variables';
import { PREVIEW_SESSION_COOKIE } from '@/utils/preview-session-cookie';
import Cookies from 'js-cookie';
import React, { useEffect } from 'react';

/**
 * Invisible client component rendered inside the Payload admin layout.
 *
 * On mount, it sets a session cookie (`payload-admin-visited`) that signals
 * to the frontend preview system that this admin has actively visited the
 * admin panel. The preview banner and preview-mode features on the public
 * site are gated behind this cookie so they don't appear until the admin
 * explicitly enters the admin panel.
 *
 * The cookie has no `max-age` / `expires`, making it a true session cookie
 * that is cleared when the browser closes.
 */
const isLocalhost = environmentVariables.NEXT_PUBLIC_APP_HOST_URL.includes('localhost');

export const SetPreviewSessionCookie: React.FC = () => {
  useEffect(() => {
    Cookies.set(PREVIEW_SESSION_COOKIE, 'true', {
      path: '/',
      sameSite: 'lax',
      secure: !isLocalhost,
    });
  }, []);

  return <></>;
};
