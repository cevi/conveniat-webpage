'use client';

import { translate } from '@/features/hof-dashboard/components/texts';
import {
  HOF_FILE_EXTENSIONS,
  HOF_FILE_MAX_BYTES,
  type HofFileKind,
  type HofSubmissionType,
} from '@/features/hof-dashboard/constants';
import { trpc } from '@/trpc/client';
import type { Locale } from '@/types/types';
import { useState } from 'react';
import { toast } from 'sonner';

/** The `accept` attribute of the file input, from the endings the server takes. */
export const HOF_FILE_ACCEPT = HOF_FILE_EXTENSIONS.map((extension) => `.${extension}`).join(',');

const hasAllowedExtension = (filename: string): boolean => {
  const extension = filename.split('.').pop()?.toLowerCase() ?? '';
  return (HOF_FILE_EXTENSIONS as readonly string[]).includes(extension);
};

/**
 * Uploads one file for a submission: the browser puts it straight into storage through a
 * presigned URL, then the server files it under the submission. The dashboard reloads after.
 */
export const useHofUpload = (
  hofId: string,
  locale: Locale,
): {
  upload: (file: File, submissionType: HofSubmissionType, kind: HofFileKind) => Promise<void>;
  uploadingKey: string | undefined;
} => {
  const utils = trpc.useUtils();
  const createUploadUrl = trpc.hofDashboard.createUploadUrl.useMutation();
  const completeUpload = trpc.hofDashboard.completeUpload.useMutation();
  const [uploadingKey, setUploadingKey] = useState<string>();

  const upload = async (
    file: File,
    submissionType: HofSubmissionType,
    kind: HofFileKind,
  ): Promise<void> => {
    if (!hasAllowedExtension(file.name)) {
      toast.error(
        translate('fileTypeNotAllowed', locale, { types: HOF_FILE_EXTENSIONS.join(', ') }),
      );
      return;
    }
    if (file.size > HOF_FILE_MAX_BYTES) {
      toast.error(translate('fileTooLarge', locale, { n: HOF_FILE_MAX_BYTES / (1024 * 1024) }));
      return;
    }

    setUploadingKey(`${submissionType}:${kind}`);
    try {
      const { url, key, contentType } = await createUploadUrl.mutateAsync({
        hofId,
        filename: file.name,
      });
      const response = await fetch(url, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': contentType },
      });
      if (!response.ok) throw new Error(`Upload failed with ${response.status}`);
      await completeUpload.mutateAsync({
        hofId,
        submissionType,
        kind,
        key,
        filename: file.name,
      });
      toast.success(translate('uploadDone', locale));
      await utils.hofDashboard.getHofDashboard.invalidate({ hofId });
    } catch (error) {
      console.error('Hof dashboard upload failed', error);
      toast.error(translate('uploadFailed', locale));
    } finally {
      setUploadingKey(undefined);
    }
  };

  return { upload, uploadingKey };
};
