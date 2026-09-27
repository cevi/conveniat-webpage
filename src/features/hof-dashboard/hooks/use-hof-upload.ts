'use client';

import {
  HOF_FILE_EXTENSIONS,
  HOF_FILE_MAX_BYTES,
  hofFileExtensionOf,
  uploadKey,
  type HofFileKind,
  type HofSubmissionType,
} from '@/features/hof-dashboard/constants';
import { translate, type TextKey } from '@/features/hof-dashboard/texts';
import { notifyFailure } from '@/features/hof-dashboard/utils/notify-failure';
import { trpc } from '@/trpc/client';
import type { Locale } from '@/types/types';
import { TRPCClientError } from '@trpc/client';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

/**
 * An upload under way: which file, how far it is, and how to call it off. Once the file is up
 * and being filed, it can no longer be called off, and `cancel` is gone.
 */
export interface UploadInProgress {
  filename: string;
  percent: number;
  cancel?: () => void;
}

/** Raised when the user calls an upload off, so it is not reported as a failure. */
class UploadCancelled extends Error {}

/**
 * What the server's refusals mean to the Hof. A file whose ending passed the checks here but
 * whose content the server refuses is damaged.
 */
const SERVER_REFUSALS: Partial<Record<string, TextKey>> = {
  unsupported_file_type: 'fileUnreadable',
  file_too_large: 'fileTooLarge',
  too_many_files: 'tooManyFiles',
};

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
    // the browser reports many times a percent; a render each would stall a cheap phone
    let reported = -1;
    request.upload.addEventListener('progress', (event) => {
      if (!event.lengthComputable) return;
      const percent = Math.round((event.loaded / event.total) * 100);
      if (percent === reported) return;
      reported = percent;
      onProgress(percent);
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
  // Leaving the dashboard, e.g. for another Hof, calls the uploads off. One already being filed
  // still is, but no longer reports it, since the user no longer sees that Hof.
  const running = useRef(new Set<() => void>());
  useEffect(() => {
    const cancels = running.current;
    return (): void => {
      for (const cancel of cancels) cancel();
    };
  }, []);

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
    // an empty file is one the phone failed to read, not a plan
    if (file.size === 0) {
      toast.error(translate('fileUnreadable', locale));
      return;
    }
    if (file.size > HOF_FILE_MAX_BYTES) {
      toast.error(translate('fileTooLarge', locale, { n: HOF_FILE_MAX_BYTES / (1024 * 1024) }));
      return;
    }

    const key = uploadKey(submissionType, kind);
    const request = new XMLHttpRequest();
    // an XHR not yet opened ignores abort(), so a cancel before the transfer starts is kept here
    const state = { cancelled: false };
    const cancel = (): void => {
      state.cancelled = true;
      request.abort();
      // the card goes back to its button at once, not when the next step notices
      track(key);
    };
    const stopIfCancelled = (): void => {
      if (state.cancelled) throw new UploadCancelled();
    };
    track(key, { filename: file.name, percent: 0, cancel });
    running.current.add(cancel);
    try {
      const target = await createUploadUrl.mutateAsync({
        hofId,
        filename: file.name,
        size: file.size,
      });
      stopIfCancelled();
      await putWithProgress(request, target.url, file, target.contentType, (percent) =>
        track(key, { filename: file.name, percent, cancel }),
      );
      stopIfCancelled();
      // filing it resets the Ressort's status, so from here on it is too late to call off
      track(key, { filename: file.name, percent: 100 });
      await completeUpload.mutateAsync({
        hofId,
        submissionType,
        kind,
        key: target.key,
        filename: file.name,
      });
      // called off meanwhile, e.g. by a switch to another Hof: its success is not this one's
      if (!state.cancelled) toast.success(translate('uploadDone', locale));
      await utils.hofDashboard.getHofDashboard.invalidate({ hofId });
    } catch (error) {
      // called off, or its Hof left meanwhile: its failure is not the one shown now
      if (error instanceof UploadCancelled || state.cancelled) return;
      const refusal = error instanceof TRPCClientError ? SERVER_REFUSALS[error.message] : undefined;
      if (refusal !== undefined) {
        toast.error(translate(refusal, locale, { n: HOF_FILE_MAX_BYTES / (1024 * 1024) }));
        return;
      }
      // only what nobody expected is worth an error report; no signal, or an upload that never
      // arrived because of it, is the usual cause
      const expected =
        !globalThis.navigator.onLine ||
        (error instanceof TRPCClientError && error.message === 'upload_missing');
      if (!expected) console.error('Hof dashboard upload failed', error);
      notifyFailure(locale, 'uploadFailed');
    } finally {
      running.current.delete(cancel);
      // a cancelled upload already left the card, which may by now hold the next one
      if (!state.cancelled) track(key);
    }
  };

  return { upload, uploads };
};
