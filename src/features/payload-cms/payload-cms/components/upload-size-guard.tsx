'use client';

import { getAdminLocale } from '@/features/payload-cms/payload-cms/utils/admin-entity-access';
import {
  fileTooLargeMessageFor,
  MAX_UPLOAD_FILE_BYTES,
} from '@/features/payload-cms/payload-cms/utils/upload-size-limit';
import { toast, useTranslation } from '@payloadcms/ui';
import type React from 'react';
import { useEffect } from 'react';

const filesOf = (event: Event): FileList | undefined => {
  if (event.type === 'drop') return (event as DragEvent).dataTransfer?.files;
  if (event.type === 'paste') return (event as ClipboardEvent).clipboardData?.files;
  if (event.target instanceof HTMLInputElement && event.target.type === 'file') {
    return event.target.files ?? undefined;
  }
  return undefined;
};

/**
 * Refuses a file above the upload limit as soon as an editor picks, drops or pastes it, instead of
 * after the browser has sent the first 100 MB of it. Payload's upload fields have no hook for
 * this, so the listeners sit on the document in the capture phase, which runs before both React's
 * handlers on the root and Payload's dropzone listeners. The server refuses such a file as well.
 */
const useRefuseOversizedUploads = (): void => {
  const { i18n } = useTranslation();
  const locale = getAdminLocale(i18n);

  useEffect(() => {
    const refuseOversized = (event: Event): void => {
      const files = filesOf(event);
      if (files === undefined) return;
      const oversized = [...files].filter((file) => file.size > MAX_UPLOAD_FILE_BYTES);
      if (oversized.length === 0) return;

      event.preventDefault();
      event.stopPropagation();
      if (event.target instanceof HTMLInputElement) event.target.value = '';
      for (const file of oversized) toast.error(fileTooLargeMessageFor(file, locale));
    };

    const events = ['change', 'drop', 'paste'] as const;
    for (const type of events) document.addEventListener(type, refuseOversized, true);
    return (): void => {
      for (const type of events) document.removeEventListener(type, refuseOversized, true);
    };
  }, [locale]);
};

/**
 * Wraps the admin panel so every upload field refuses files above the limit before sending them.
 *
 * @param props - the admin panel
 * @returns the children, unchanged
 */
export const UploadSizeGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useRefuseOversizedUploads();
  return children;
};
