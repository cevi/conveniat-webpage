import { PostHogProvider } from '@/providers/post-hog-provider';
import config from '@payload-config';
import '@payloadcms/next/css';
import { handleServerFunctions, RootLayout } from '@payloadcms/next/layouts';
import type { ServerFunctionClient } from 'payload';
import React, { Suspense } from 'react';
import { EnableDraftMode } from '../../features/payload-cms/components/enable-draft-mode';
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
  <Suspense>
    <RootLayout config={config} importMap={importMap} serverFunction={serverFunction}>
      <EnableDraftMode />
      <PostHogProvider>
        <QueryClientProvider>{children}</QueryClientProvider>
      </PostHogProvider>
    </RootLayout>
  </Suspense>
);

export default Layout;
