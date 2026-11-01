import { PostHogProvider } from '@/providers/post-hog-provider';
import config from '@payload-config';
import '@payloadcms/next/css';
import { handleServerFunctions, RootLayout } from '@payloadcms/next/layouts';
import { connection } from 'next/server';
import type { ServerFunctionClient } from 'payload';
import React, { Suspense } from 'react';

import { SetPreviewSessionCookie } from '@/features/payload-cms/components/set-preview-session-cookie';
import { QueryClientProvider } from '../../providers/query-client-provider';
import { importMap } from './admin/importMap.js';
import './custom.scss';
import './payload-tailwind-setup.css';

type Args = {
  children: React.ReactNode;
};

// The admin panel renders per request (see `DynamicAdminWrapper`), so a navigation into it
// always waits on the server. Next.js validates every page for instant navigation in
// development and, failing to explain why the admin cannot be instant, fills the dev overlay
// with an InvariantError on every admin page. Setting `false` here, at the top of the admin
// tree, opts the whole panel out of that validation and of the static-shell check.
export const instant = false;

const serverFunction: ServerFunctionClient = async function (args) {
  'use server';
  return handleServerFunctions({
    ...args,
    config,
    importMap,
  });
};

const DynamicAdminWrapper = async ({ children }: { children: React.ReactNode }) => {
  await connection();
  return <>{children}</>;
};

const Layout = ({ children }: Args) => (
  <Suspense fallback={<div />}>
    <DynamicAdminWrapper>
      <RootLayout config={config} importMap={importMap} serverFunction={serverFunction}>
        <PostHogProvider>
          <QueryClientProvider>
            <SetPreviewSessionCookie />
            {children}
          </QueryClientProvider>
        </PostHogProvider>
      </RootLayout>
    </DynamicAdminWrapper>
  </Suspense>
);

export default Layout;
