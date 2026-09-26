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

/** An upload under way: which file, how far it is, and how to call it off. */
export interface UploadInProgress {
  filename: string;
  percent: number;
  cancel: () => void;
}

/** Raised when the user calls an upload off, so it is not reported as a failure. */
class UploadCancelled extends Error {}

/**
 * Puts the file to storage with the progress reported as it goes. `fetch` cannot report the
 * progress of a request body, and a plan of 20 MB takes minutes on camp wifi.
 */
const putWithProgress = (
  request: XMLHttpRequest,
  url: string,
  file: File,
  contentType: string,
  onProgress: (percent: number) => void,
): Promise<void> =>
  new Promise((resolve, reject) => {
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
    request.addEventListener('abort', () => reject(new UploadCancelled()));
    request.send(file);
  });

/**
 * Uploads files for the submissions: the browser puts each file straight into storage through
 * a presigned URL, then the server files it under the submission. Several uploads may run at
 * once; `uploads` holds each one under way, by `uploadKey`.
 */
export const useHofUpload = (
  hofId: string,
  locale: Locale,
): {
  upload: (file: File, submissionType: HofSubmissionType, kind: HofFileKind) => Promise<void>;
  uploads: Record<string, UploadInProgress>;
} => {
  const utils = trpc.useUtils();
  // fail right away without signal instead of waiting paused for it, so the user hears of it
  const createUploadUrl = trpc.hofDashboard.createUploadUrl.useMutation({ networkMode: 'always' });
  const completeUpload = trpc.hofDashboard.completeUpload.useMutation({ networkMode: 'always' });
  const [uploads, setUploads] = useState<Record<string, UploadInProgress>>({});

  /** Records how far an upload is, or forgets it once it is over. */
  const track = (key: string, upload?: UploadInProgress): void =>
    setUploads((previous) => {
      const rest = Object.fromEntries(Object.entries(previous).filter(([other]) => other !== key));
      return upload === undefined ? rest : { ...rest, [key]: upload };
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
    const request = new XMLHttpRequest();
    const cancel = (): void => request.abort();
    track(key, { filename: file.name, percent: 0, cancel });
    try {
      const target = await createUploadUrl.mutateAsync({ hofId, filename: file.name });
      await putWithProgress(request, target.url, file, target.contentType, (percent) =>
        track(key, { filename: file.name, percent, cancel }),
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
      if (error instanceof UploadCancelled) return;
      console.error('Hof dashboard upload failed', error);
      // the server's content check rejects a file whose ending does not match what it is
      if (error instanceof TRPCClientError && error.message === 'unsupported_file_type') {
        toast.error(translate('fileTypeNotAllowed', locale, { types: typesText }));
      } else {
        notifyFailure(locale, 'uploadFailed');
      }
    } finally {
      track(key);
    }
  };

  return { upload, uploads };
};
