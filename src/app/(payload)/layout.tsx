import { PostHogProvider } from '@/providers/post-hog-provider';
import config from '@payload-config';
import '@payloadcms/next/css';
import { handleServerFunctions, RootLayout } from '@payloadcms/next/layouts';
import type { ServerFunctionClient } from 'payload';
import React from 'react';
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
  <RootLayout config={config} importMap={importMap} serverFunction={serverFunction}>
    <PostHogProvider>
      <QueryClientProvider>{children}</QueryClientProvider>
    </PostHogProvider>
  </RootLayout>
);

export default Layout;
