import { getHofDashboardData, idOf } from '@/features/hof-dashboard/api/hof-dashboard-data';
import { renderSubmissionPdf } from '@/features/hof-dashboard/api/render-submission-pdf';
import { translate } from '@/features/hof-dashboard/texts';
import type { HofName } from '@/features/payload-cms/payload-cms/access-rules/can-access-hof-dashboard';
import { FORM_FILE_BUCKET_NAME, s3Client } from '@/lib/s3';
import type { Locale } from '@/types/types';
import { createLogger } from '@/utils/server-logger';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import config from '@payload-config';
import { Zip, ZipPassThrough } from 'fflate';
import { getPayload } from 'payload';

const logger = createLogger('hof-dashboard:files-zip');

/** What goes in the ZIP, and where: the form, then the name with its version at the end. */
export type HofZipEntry = { path: string; submittedAt: string } & (
  | { key: string } // a file handed in, read from the bucket
  | { render: () => Promise<Uint8Array> } // a PDF of a submission, rendered as it goes out
);

/** A name that stays one folder or file on every system that unpacks it. */
const safeName = (name: string): string => {
  // eslint-disable-next-line no-control-regex -- control characters are what is removed
  const safe = name.replaceAll(/[\u0000-\u001F<>:"/\\|?*]/g, '_').trim();
  return safe === '' ? '_' : safe;
};

/** A name split before its extension, `plan` and `.pdf`; a leading dot starts no extension. */
const splitExtension = (name: string): [stem: string, extension: string] => {
  const dot = name.lastIndexOf('.');
  return dot > name.lastIndexOf('/') + 1 ? [name.slice(0, dot), name.slice(dot)] : [name, ''];
};

/** `name` or, once taken, `name (2)` and so on, with the extension kept at the end. */
const uniquePath = (path: string, taken: Set<string>): string => {
  const [stem, extension] = splitExtension(path);
  let candidate = path;
  for (let n = 2; taken.has(candidate.toLowerCase()); n += 1) {
    candidate = `${stem} (${n})${extension}`;
  }
  taken.add(candidate.toLowerCase());
  return candidate;
};

/**
 * Everything one Hof handed in with a form on the dashboard, earlier versions included, one
 * folder per form: every file, named with the version it came with, `plan_v2.pdf`, and every
 * submission as a PDF, `Hofbauten_v2.pdf`, with all its answers and the Ressort's answer. A form
 * of entries numbers its entries instead, `stand_3.pdf`. The caller has checked that the user
 * may open the Hof; the history of the review is only in it for a reviewer.
 */
export const listHofZipEntries = async (
  hof: HofName,
  locale: Locale,
  isReviewer: boolean,
): Promise<HofZipEntry[]> => {
  const { forms } = await getHofDashboardData(hof.id, locale, isReviewer);
  const submissionIds = forms.flatMap((form) => form.entries.map((entry) => entry.id));
  if (submissionIds.length === 0) return [];

  // by the submission they belong to, so a file whose field left the form is still in it
  const payload = await getPayload({ config });
  const { docs: storedFiles } = await payload.find({
    collection: 'form_collection',
    where: { formSubmission: { in: submissionIds } },
    depth: 0,
    pagination: false,
    overrideAccess: true,
    select: { filename: true, originalFilename: true, formSubmission: true },
  });

  const submissions = forms.flatMap((form) => {
    const folder = safeName(form.title);
    // the dashboard lists them newest first and counts its versions from the oldest
    return form.entries.map((entry, index) => {
      const n = form.entries.length - index;
      return {
        form,
        entry,
        folder,
        suffix: form.mode === 'versions' ? `_v${n}` : `_${n}`,
        heading:
          form.mode === 'versions'
            ? translate('version', locale, { n })
            : (entry.title ?? translate('entryNumbered', locale, { n })),
      };
    });
  });
  const submissionById = new Map(
    submissions.map((submission) => [submission.entry.id, submission]),
  );

  // the files take their names first, so only a PDF ever makes way with a "(2)"
  const taken = new Set<string>();
  const fileNames = new Map<string, string>();
  const files = storedFiles
    .flatMap((file) => {
      const submission = submissionById.get(idOf(file.formSubmission) ?? '');
      if (submission === undefined || typeof file.filename !== 'string') return [];
      const [stem, extension] = splitExtension(safeName(file.originalFilename ?? file.filename));
      return [
        {
          id: file.id,
          key: file.filename,
          path: `${submission.folder}/${stem}${submission.suffix}${extension}`,
          submittedAt: submission.entry.submittedAt,
        },
      ];
    })
    .toSorted((a, b) => a.path.localeCompare(b.path, 'de'))
    .map(({ id, ...file }) => {
      const path = uniquePath(file.path, taken);
      fileNames.set(id, path.slice(path.indexOf('/') + 1));
      return { ...file, path };
    });

  const generatedAt = new Date();
  const answers = submissions.map(({ form, entry, folder, suffix, heading }): HofZipEntry => ({
    path: uniquePath(`${folder}/${safeName(form.title)}${suffix}.pdf`, taken),
    submittedAt: entry.submittedAt,
    render: () =>
      renderSubmissionPdf({
        hofName: hof.name,
        form,
        entry,
        heading,
        fileNames,
        locale,
        generatedAt,
      }),
  }));

  return [...files, ...answers].toSorted((a, b) => a.path.localeCompare(b.path, 'de'));
};

const readFromBucket = async (key: string): Promise<ReadableStream<Uint8Array> | undefined> => {
  try {
    const object = await s3Client.send(
      new GetObjectCommand({ Bucket: FORM_FILE_BUCKET_NAME, Key: key }),
    );
    return object.Body?.transformToWebStream();
  } catch (error) {
    logger.warn('Left a missing file out of a Hof ZIP', { error });
    return undefined;
  }
};

const renderPdf = async (
  entry: Extract<HofZipEntry, { render: unknown }>,
): Promise<ReadableStream<Uint8Array> | undefined> => {
  try {
    return new Blob([await entry.render()]).stream();
  } catch (error) {
    // one submission that does not render should not cost the Hof the rest of its ZIP
    logger.error('Left a submission PDF that failed to render out of a Hof ZIP', {
      error,
      'hof_dashboard.zip_path': entry.path,
    });
    return undefined;
  }
};

/**
 * The entries as one ZIP, streamed: each file is read from the bucket, and each PDF rendered,
 * only once the one before it has gone out, so neither the server nor a slow download holds
 * more than a file. Stored, not compressed, since plans come as PDFs and images that compress
 * no further. A file missing in the bucket is left out rather than breaking the download.
 */
export const zipHofFiles = (entries: readonly HofZipEntry[]): ReadableStream<Uint8Array> => {
  async function* chunks(): AsyncGenerator<Uint8Array, void> {
    const ready: Uint8Array[] = [];
    let failure: Error | undefined;
    const zip = new Zip((error, chunk) => {
      if (error === null) ready.push(chunk);
      else failure = error;
    });
    const drain = function* (): Generator<Uint8Array> {
      if (failure !== undefined) throw failure;
      yield* ready.splice(0);
    };

    for (const file of entries) {
      const body = 'key' in file ? await readFromBucket(file.key) : await renderPdf(file);
      if (body === undefined) continue;

      const entry = new ZipPassThrough(file.path);
      entry.mtime = new Date(file.submittedAt);
      zip.add(entry);
      const reader = body.getReader();
      for (let read = await reader.read(); !read.done; read = await reader.read()) {
        entry.push(read.value);
        yield* drain();
      }
      entry.push(new Uint8Array(0), true);
      yield* drain();
    }
    zip.end();
    yield* drain();
  }

  const iterator = chunks();
  return new ReadableStream<Uint8Array>({
    async pull(controller): Promise<void> {
      try {
        const next = await iterator.next();
        if (next.done === true) controller.close();
        else controller.enqueue(next.value);
      } catch (error) {
        // the headers are out, so the download can only break off
        logger.error('A Hof ZIP broke off while it was sent', { error });
        controller.error(error);
      }
    },
    async cancel(): Promise<void> {
      // a download broken off by the reader stops reading from the bucket
      await iterator.return();
    },
  });
};
