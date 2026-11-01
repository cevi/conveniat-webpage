'use client';

import { generatePreviewUrl } from '@/features/payload-cms/utils/preview/generate-preview-url';
import { useDocumentInfo, useFormFields, useLivePreviewContext, useLocale } from '@payloadcms/ui';
import type { Locale } from 'payload';
import React, { useEffect, useRef } from 'react';

/**
 * Payload always opens the live preview at its "Responsive" size and has no setting for another
 * one. Picks `breakpoint` once when the preview opens; the editor can switch away from it.
 */
const useDefaultBreakpoint = (breakpoint: string | undefined): void => {
  const { isLivePreviewing, setBreakpoint } = useLivePreviewContext();
  const applied = useRef(false);

  useEffect(() => {
    if (breakpoint === undefined || !isLivePreviewing || applied.current) return;
    applied.current = true;
    setBreakpoint(breakpoint);
  }, [breakpoint, isLivePreviewing, setBreakpoint]);
};

export const LivePreviewRestorer: React.FC<{
  /** the device size the preview opens at, a `name` from the configured breakpoints */
  defaultBreakpoint?: string;
}> = ({ defaultBreakpoint }) => {
  useDefaultBreakpoint(defaultBreakpoint);
  const { setURL, isLivePreviewing, url: contextUrl } = useLivePreviewContext();
  const { collectionSlug, globalSlug, id } = useDocumentInfo();
  const { code: currentLocaleCode } = useLocale();

  const urlSlugField = useFormFields(
    ([fields]) => fields['seo.urlSlug']?.value as string | undefined,
  );

  const localeCode = currentLocaleCode;

  const urlReference = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!isLivePreviewing) return;

    const data: Parameters<typeof generatePreviewUrl>[0]['data'] = {
      ...(typeof id === 'string' || typeof id === 'number' ? { id: String(id) } : {}),
      ...(typeof urlSlugField === 'string' ? { seo: { urlSlug: urlSlugField } } : {}),
    };

    // Construct strict mock objects to satisfy TypeScript without `any`
    const mockLocale = { code: localeCode } as Locale;

    let dynamicUrl = generatePreviewUrl({
      data,
      ...(typeof collectionSlug === 'string'
        ? {
            collectionConfig: { slug: collectionSlug } as NonNullable<
              Parameters<typeof generatePreviewUrl>[0]['collectionConfig']
            >,
          }
        : {}),
      ...(typeof globalSlug === 'string' ? { globalSlug } : {}),
      locale: mockLocale,
    });

    try {
      if (typeof contextUrl === 'string' && contextUrl !== '') {
        const payloadUrl = new URL(contextUrl, globalThis.location.origin);
        const token = payloadUrl.searchParams.get('token');
        if (token !== null && token !== '') {
          dynamicUrl += `&token=${token}`;
        }
      }
    } catch {}

    // If Payload internally resets the URL to the static config string,
    // or if we have calculated a fresh URL, we forcefully overwrite it.
    // By checking the actual Context `url`, we create a self-healing loop.
    if (contextUrl !== dynamicUrl) {
      console.log(`[LivePreviewSync] Hydrating dynamic client URL: ${dynamicUrl}`);
      urlReference.current = dynamicUrl;
      setURL(dynamicUrl);
    }
  }, [
    urlSlugField,
    collectionSlug,
    globalSlug,
    id,
    localeCode,
    isLivePreviewing,
    contextUrl,
    setURL,
  ]);

  return <div style={{ display: 'none' }} data-url-restorer="sync-active" />;
};

export default LivePreviewRestorer;
