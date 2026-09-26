'use client';

import { translate } from '@/features/hof-dashboard/components/texts';
import {
  HOF_FILE_EXTENSIONS,
  HOF_FILE_MAX_BYTES,
  hofFileExtensionOf,
  type HofFileKind,
  type HofSubmissionType,
} from '@/features/hof-dashboard/constants';
import { trpc } from '@/trpc/client';
import type { Locale } from '@/types/types';
import { TRPCClientError } from '@trpc/client';
import { useState } from 'react';
import { toast } from 'sonner';

/** The `accept` attribute of the file input, from the endings the server takes. */
export const HOF_FILE_ACCEPT = HOF_FILE_EXTENSIONS.map((extension) => `.${extension}`).join(',');

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
    if (hofFileExtensionOf(file.name) === undefined) {
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
      // the server's content check rejects a file whose ending does not match what it is
      const rejected =
        error instanceof TRPCClientError && error.message === 'unsupported_file_type';
      toast.error(
        rejected
          ? translate('fileTypeNotAllowed', locale, { types: HOF_FILE_EXTENSIONS.join(', ') })
          : translate('uploadFailed', locale),
      );
    } finally {
      setUploadingKey(undefined);
    }
  };

  return { upload, uploadingKey };
};
