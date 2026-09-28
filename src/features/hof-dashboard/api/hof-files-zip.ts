import { findDashboardForms, idOf } from '@/features/hof-dashboard/api/hof-dashboard-data';
import { S3_BUCKET_NAME, s3Client } from '@/lib/s3';
import type { Locale } from '@/types/types';
import { createLogger } from '@/utils/server-logger';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import config from '@payload-config';
import { Zip, ZipPassThrough } from 'fflate';
import { getPayload } from 'payload';

const logger = createLogger('hof-dashboard:files-zip');

/** Most submissions of one Hof read for its files, as its dashboard lists them. */
const MAX_SUBMISSIONS = 500;

/** A file a Hof handed in, and where it goes in the ZIP. */
export interface HofZipFile {
  /** The object in the bucket. */
  key: string;
  /** Folder and name in the ZIP: the form, then the day it was handed in and the file's name. */
  path: string;
  submittedAt: string;
}

const zurichDay = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Zurich',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** A name that stays one folder or file on every system that unpacks it. */
const safeName = (name: string): string => {
  // eslint-disable-next-line no-control-regex -- control characters are what is removed
  const safe = name.replaceAll(/[\u0000-\u001F<>:"/\\|?*]/g, '_').trim();
  return safe === '' ? '_' : safe;
};

/** `name` or, once taken, `name (2)` and so on, with the extension kept at the end. */
const uniquePath = (path: string, taken: Set<string>): string => {
  let candidate = path;
  const dot = path.lastIndexOf('.');
  const hasExtension = dot > path.lastIndexOf('/') + 1;
  const stem = hasExtension ? path.slice(0, dot) : path;
  const extension = hasExtension ? path.slice(dot) : '';
  for (let n = 2; taken.has(candidate.toLowerCase()); n += 1) {
    candidate = `${stem} (${n})${extension}`;
  }
  taken.add(candidate.toLowerCase());
  return candidate;
};

/**
 * Every file one Hof handed in with a form on the dashboard, earlier versions included, one
 * folder per form. The caller has checked that the user may open the Hof.
 */
export const listHofFiles = async (hofId: string, locale: Locale): Promise<HofZipFile[]> => {
  const payload = await getPayload({ config });
  const forms = await findDashboardForms(payload, locale);
  if (forms.length === 0) return [];

  const { docs: submissions } = await payload.find({
    collection: 'form-submissions',
    where: { and: [{ hof: { equals: hofId } }, { form: { in: forms.map((form) => form.id) } }] },
    sort: '-createdAt',
    depth: 0,
    limit: MAX_SUBMISSIONS,
    pagination: false,
    overrideAccess: true,
    select: { form: true, createdAt: true },
  });
  if (submissions.length === 0) return [];

  const { docs: files } = await payload.find({
    collection: 'form_collection',
    where: { formSubmission: { in: submissions.map((submission) => submission.id) } },
    depth: 0,
    pagination: false,
    overrideAccess: true,
    select: { filename: true, originalFilename: true, formSubmission: true },
  });

  const submissionById = new Map(submissions.map((submission) => [submission.id, submission]));
  const titleOf = new Map(
    forms.map((form) => [
      form.id,
      typeof form.hofDashboard?.title === 'string' && form.hofDashboard.title !== ''
        ? form.hofDashboard.title
        : form.title,
    ]),
  );
  const taken = new Set<string>();
  return files
    .flatMap((file) => {
      const submission = submissionById.get(idOf(file.formSubmission) ?? '');
      if (submission === undefined || typeof file.filename !== 'string') return [];
      const name = file.originalFilename ?? file.filename;
      const folder = titleOf.get(idOf(submission.form) ?? '') ?? '_';
      return [
        {
          key: file.filename,
          path: `${safeName(folder)}/${zurichDay.format(new Date(submission.createdAt))} ${safeName(name)}`,
          submittedAt: submission.createdAt,
        },
      ];
    })
    .toSorted((a, b) => a.path.localeCompare(b.path, 'de'))
    .map((file) => ({ ...file, path: uniquePath(file.path, taken) }));
};

/**
 * The files as one ZIP, streamed: each file is read from the bucket only once the one before
 * it has gone out, so neither the server nor a slow download holds more than a chunk. Stored,
 * not compressed, since plans come as PDFs and images that compress no further. A file
 * missing in the bucket is left out rather than breaking the download.
 */
export const zipHofFiles = (files: readonly HofZipFile[]): ReadableStream<Uint8Array> => {
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

    for (const file of files) {
      let body: ReadableStream<Uint8Array> | undefined;
      try {
        const object = await s3Client.send(
          new GetObjectCommand({ Bucket: S3_BUCKET_NAME, Key: file.key }),
        );
        body = object.Body?.transformToWebStream();
      } catch (error) {
        logger.warn('Left a missing file out of a Hof ZIP', { error });
      }
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
