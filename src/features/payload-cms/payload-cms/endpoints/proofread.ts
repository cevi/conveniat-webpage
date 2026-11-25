import { environmentVariables } from '@/config/environment-variables';
import { isEditor } from '@/features/payload-cms/payload-cms/access-rules/roles';
import { getLocalizedFieldPaths } from '@/features/payload-cms/payload-cms/services/field-introspection';
import {
  collectProofreadSegments,
  ProofreadUnavailableError,
  proofreadWithGemini,
  type ProofreadModel,
} from '@/features/payload-cms/payload-cms/services/gemini-proofread';
import type { ProofreadResponse } from '@/features/payload-cms/payload-cms/utils/proofread';
import { defineCounter, defineHistogram } from '@/lib/telemetry/metrics';
import type { Field, PayloadHandler, PayloadRequest } from 'payload';
import { z } from 'zod';

type ProofreadOutcome = 'findings' | 'clean' | 'timeout' | 'failed';

const proofreads = defineCounter<{ outcome: ProofreadOutcome }>({
  scope: 'payload-cms',
  name: 'cms_proofread_total',
  description: 'Proofreading checks in the publish dialog, by outcome',
});

const proofreadDuration = defineHistogram<{ model: ProofreadModel }>({
  scope: 'payload-cms',
  name: 'cms_proofread_duration_seconds',
  description: 'How long Gemini took to proofread a document before publishing, by model',
  // Flash-Lite answers in about five seconds, Flash in fifteen to twenty; the request gives
  // up at forty-five
  buckets: [2, 5, 8, 12, 16, 20, 25, 30, 45],
});

const requestSchema = z
  .object({
    collection: z.string().optional(),
    global: z.string().optional(),
    locale: z.enum(['de', 'fr', 'en']),
    // the unsaved form state, so the check sees what is about to be published
    data: z.record(z.string(), z.unknown()),
  })
  .refine((body) => (body.collection === undefined) !== (body.global === undefined), {
    message: 'Name either a collection or a global',
  });

/** The fields of the collection or global the form belongs to, if it exists. */
const fieldsOf = (
  payload: PayloadRequest['payload'],
  { collection, global }: { collection?: string | undefined; global?: string | undefined },
): Field[] | undefined => {
  if (collection === undefined) {
    return payload.config.globals.find((config) => config.slug === global)?.fields;
  }
  if (!(collection in payload.collections)) return undefined;
  return payload.collections[collection as keyof typeof payload.collections].config.fields;
};

/**
 * Proofreads the form state of one locale with Gemini before an editor publishes it.
 *
 * It reads nothing from the database: the caller sends the text, and the collection or global
 * only tells which of its fields are text. Without a `GEMINI_API_KEY` it answers `disabled`,
 * and the dialog shows nothing.
 */
export const proofreadHandler: PayloadHandler = async (request) => {
  if (!isEditor({ req: request })) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const apiKey = environmentVariables.GEMINI_API_KEY;
  if (apiKey === undefined || apiKey === '') {
    return Response.json({ status: 'disabled' } satisfies ProofreadResponse);
  }

  let json: unknown;
  try {
    json = await request.json?.();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const parsed = requestSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: 'Invalid request' }, { status: 400 });
  }
  const { collection, global, locale, data } = parsed.data;

  const { payload } = request;
  const fields = fieldsOf(payload, parsed.data);
  if (fields === undefined) {
    return Response.json({ error: 'Collection or global not found' }, { status: 404 });
  }

  const segments = collectProofreadSegments(data, getLocalizedFieldPaths(fields), locale);
  if (segments.length === 0) {
    return Response.json({ status: 'done', findings: [] } satisfies ProofreadResponse);
  }

  const started = performance.now();
  const seconds = (): number => (performance.now() - started) / 1000;
  try {
    const { model, findings } = await proofreadWithGemini(segments, locale, apiKey);
    proofreads.add(1, { outcome: findings.length > 0 ? 'findings' : 'clean' });
    // only answered checks: how often the fallback answers shows in its count
    proofreadDuration.record(seconds(), { model });
    payload.logger.debug(
      { collection, global, locale, model, segments: segments.length, findings: findings.length },
      'Proofread a document before publishing',
    );
    return Response.json({ status: 'done', findings } satisfies ProofreadResponse);
  } catch (error) {
    const outcome = error instanceof ProofreadUnavailableError ? error.reason : 'failed';
    proofreads.add(1, { outcome });
    // publishing goes on without the check, so this is worth a look but no alarm
    payload.logger.warn(
      { err: error, collection, global, locale },
      'Proofreading before publishing failed',
    );
    return Response.json({ error: 'Proofreading unavailable' }, { status: 503 });
  }
};
