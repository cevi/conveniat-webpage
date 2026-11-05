'use client';

import { useConfig, useDocumentInfo } from '@payloadcms/ui';

/**
 * The REST path of the channel collection whose document is open, where its audience
 * endpoints sit; undefined outside a collection document.
 */
export const useChannelApiPath = (): string | undefined => {
  const { config } = useConfig();
  const { collectionSlug } = useDocumentInfo();
  if (collectionSlug === undefined) return undefined;
  return `${config.serverURL}${config.routes.api}/${collectionSlug}`;
};
