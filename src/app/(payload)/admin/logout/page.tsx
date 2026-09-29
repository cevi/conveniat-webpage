'use client';

import { ConveniatLogo } from '@/components/svg-logos/conveniat-logo';
import { AdminPanelBackgroundFaker } from '@/features/payload-cms/payload-cms/components/login-page/admin-panel-background-faker';
import { Config } from '@/features/payload-cms/payload-types';
import { flushPersonalData } from '@/lib/flush-personal-data';
import { StaticTranslationString } from '@/types/types';
import { PREVIEW_SESSION_COOKIE } from '@/utils/preview-session-cookie';
import { unsubscribeFromPushNotifications } from '@/utils/push-notifications/push-subscription';
import { useLocale } from '@payloadcms/ui';
import Cookies from 'js-cookie';
import { signOut } from 'next-auth/react';
import { useEffect } from 'react';

const localizedLogoutText: StaticTranslationString = {
  en: 'Logging out...',
  de: 'Abmelden...',
  fr: 'Déconnexion...',
};

const Page = () => {
  const { code } = useLocale() as { code: Config['locale'] };

  useEffect(() => {
    const doLogout = async () => {
      // The browser's push subscription outlives the session and would keep delivering this
      // user's chats to the next person on the machine. The admin panel has no tRPC provider,
      // so the device-wide release the app does on logout is out of reach here.
      await unsubscribeFromPushNotifications().catch((error: unknown) => {
        console.warn('Releasing the push subscription on logout failed', error);
      });

      // Flush all cached personal data before logging out
      flushPersonalData({ clearCachedPages: true });

      // Clear the preview session cookie before logging out
      Cookies.remove(PREVIEW_SESSION_COOKIE, { path: '/' });

      await signOut({
        redirect: true,
        callbackUrl: '/',
      });
    };

    void doLogout();
  }, []);

  return (
    <>
      <AdminPanelBackgroundFaker />
      <div className="fixed top-0 left-0 flex h-screen w-screen flex-row justify-center">
        <div className="mt-2 flex flex-col justify-center text-center">
          <ConveniatLogo className="mx-auto mb-8 h-18 w-18" />
          <h1 className="text-conveniat-green mb-16 text-3xl font-extrabold">conveniat27</h1>
          <span className="text-conveniat-green">{localizedLogoutText[code]}</span>
        </div>
      </div>
    </>
  );
};

export default Page;
