import { PostHogProvider } from '@/providers/post-hog-provider';
import config from '@payload-config';
import '@payloadcms/next/css';
import { handleServerFunctions, RootLayout } from '@payloadcms/next/layouts';
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

const serverFunction: ServerFunctionClient = async function (args) {
  'use server';
  return handleServerFunctions({
    ...args,
    config,
    importMap,
  });
};

const Layout = ({ children }: Args) => (
  <Suspense fallback={null}>
    <RootLayout config={config} importMap={importMap} serverFunction={serverFunction}>
      <PostHogProvider>
        <QueryClientProvider>
          <SetPreviewSessionCookie />
          {children}
        </QueryClientProvider>
      </PostHogProvider>
    </RootLayout>
  </Suspense>
);

export default Layout;
