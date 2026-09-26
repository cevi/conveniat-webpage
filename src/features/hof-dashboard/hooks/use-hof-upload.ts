'use client';

import {
  HOF_FILE_EXTENSIONS,
  HOF_FILE_MAX_BYTES,
  hofFileExtensionOf,
  uploadKey,
  type HofFileKind,
  type HofSubmissionType,
} from '@/features/hof-dashboard/constants';
import { translate } from '@/features/hof-dashboard/texts';
import { notifyFailure } from '@/features/hof-dashboard/utils/notify-failure';
import { trpc } from '@/trpc/client';
import type { Locale } from '@/types/types';
import { TRPCClientError } from '@trpc/client';
import { useState } from 'react';
import { toast } from 'sonner';

/**
 * Puts the file to storage with the progress reported as it goes. `fetch` cannot report the
 * progress of a request body, and a plan of 20 MB takes minutes on camp wifi.
 */
const putWithProgress = (
  url: string,
  file: File,
  contentType: string,
  onProgress: (percent: number) => void,
): Promise<void> =>
  new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open('PUT', url);
    request.setRequestHeader('Content-Type', contentType);
    request.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    });
    request.addEventListener('load', () => {
      if (request.status >= 200 && request.status < 300) resolve();
      else reject(new Error(`Upload failed with ${request.status}`));
    });
    request.addEventListener('error', () => reject(new Error('Upload failed')));
    request.send(file);
  });

/**
 * Uploads files for the submissions: the browser puts each file straight into storage through
 * a presigned URL, then the server files it under the submission. Several uploads may run at
 * once; `progress` holds the percentage of each, by `uploadKey`.
 */
export const useHofUpload = (
  hofId: string,
  locale: Locale,
): {
  upload: (file: File, submissionType: HofSubmissionType, kind: HofFileKind) => Promise<void>;
  progress: Record<string, number>;
} => {
  const utils = trpc.useUtils();
  // fail right away without signal instead of waiting paused for it, so the user hears of it
  const createUploadUrl = trpc.hofDashboard.createUploadUrl.useMutation({ networkMode: 'always' });
  const completeUpload = trpc.hofDashboard.completeUpload.useMutation({ networkMode: 'always' });
  const [progress, setProgress] = useState<Record<string, number>>({});

  const setPercent = (key: string, percent: number | undefined): void =>
    setProgress((previous) => {
      const rest = Object.fromEntries(Object.entries(previous).filter(([other]) => other !== key));
      return percent === undefined ? rest : { ...rest, [key]: percent };
    });

  const upload = async (
    file: File,
    submissionType: HofSubmissionType,
    kind: HofFileKind,
  ): Promise<void> => {
    const typesText = HOF_FILE_EXTENSIONS.join(', ');
    if (hofFileExtensionOf(file.name) === undefined) {
      toast.error(translate('fileTypeNotAllowed', locale, { types: typesText }));
      return;
    }
    if (file.size > HOF_FILE_MAX_BYTES) {
      toast.error(translate('fileTooLarge', locale, { n: HOF_FILE_MAX_BYTES / (1024 * 1024) }));
      return;
    }

    const key = uploadKey(submissionType, kind);
    setPercent(key, 0);
    try {
      const target = await createUploadUrl.mutateAsync({ hofId, filename: file.name });
      await putWithProgress(target.url, file, target.contentType, (percent) =>
        setPercent(key, percent),
      );
      await completeUpload.mutateAsync({
        hofId,
        submissionType,
        kind,
        key: target.key,
        filename: file.name,
      });
      toast.success(translate('uploadDone', locale));
      await utils.hofDashboard.getHofDashboard.invalidate({ hofId });
    } catch (error) {
      console.error('Hof dashboard upload failed', error);
      // the server's content check rejects a file whose ending does not match what it is
      if (error instanceof TRPCClientError && error.message === 'unsupported_file_type') {
        toast.error(translate('fileTypeNotAllowed', locale, { types: typesText }));
      } else {
        notifyFailure(locale, 'uploadFailed');
      }
    } finally {
      setPercent(key, undefined);
    }
  };

  return { upload, progress };
};
