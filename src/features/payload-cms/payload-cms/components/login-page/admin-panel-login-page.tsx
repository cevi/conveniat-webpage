import { CeviDatabaseLoginPanel } from '@/features/payload-cms/payload-cms/components/login-page/cevi-db-login-panel';
import {
  resolveLoginReturnPath,
  returnsToAdminPanel,
} from '@/features/payload-cms/payload-cms/components/login-page/login-return-path';
import { cookies } from 'next/headers';
import type React from 'react';

/** Auth.js prefixes its cookies with `__Secure-` whenever the site is served over HTTPS. */
const CALLBACK_COOKIE_NAMES = ['__Secure-authjs.callback-url', 'authjs.callback-url'];

const firstValue = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value;

interface AdminPanelLoginPageProperties {
  searchParams?: Record<string, string | string[] | undefined>;
}

/**
 * The login button on Payload's login view, which is also the page Auth.js sends every login to
 * that failed or that named no provider, wherever on the site it started.
 *
 * It therefore reads where the login started, so that the next attempt returns there and not
 * into the admin panel, and it says so when the address carries `?error`. A login without a
 * provider names the page in `?callbackUrl`. A failed one names nothing, and only Auth.js's
 * callback cookie still knows. That cookie outlives the login it was set for, so it counts after
 * a failure only: an editor opening the admin login is not sent to the page they last logged in
 * from.
 */
const AdminPanelLoginPage: React.FC<AdminPanelLoginPageProperties> = async ({ searchParams }) => {
  const error = firstValue(searchParams?.['error']);
  const hasFailed = error !== undefined && error !== '';

  const cookieStore = hasFailed ? await cookies() : undefined;
  const returnPath = resolveLoginReturnPath([
    firstValue(searchParams?.['callbackUrl']),
    ...CALLBACK_COOKIE_NAMES.map((name) => cookieStore?.get(name)?.value),
  ]);

  return (
    <CeviDatabaseLoginPanel
      returnPath={returnPath}
      isAdminPanelLogin={returnsToAdminPanel(returnPath)}
      hasFailed={hasFailed}
    />
  );
};

export default AdminPanelLoginPage;
