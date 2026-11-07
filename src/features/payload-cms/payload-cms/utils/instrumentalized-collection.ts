import { annotateRequest, appendToRequest } from '@/lib/request-span';
import type { Span, Tracer } from '@opentelemetry/api';
import { SpanStatusCode, trace } from '@opentelemetry/api';
import type {
  CollectionAfterErrorHook,
  CollectionAfterOperationHook,
  CollectionBeforeOperationHook,
  CollectionConfig,
} from 'payload';

const getTracer = (): Tracer => trace.getTracer('payload-cms-instrumentation');

/**
 * Payload's own collections (preferences, locked documents, jobs, the MCP keys) run on nearly
 * every admin request. They keep their spans, but would crowd the request's list of what it
 * did, which is meant to name the content it touched.
 */
const isInternalCollection = (slug: string): boolean => slug.startsWith('payload-');

/** The id of a single document, as `findByID`, `update` and `delete` by id carry it. */
const documentId = (value: unknown): string | undefined => {
  if (typeof value === 'object' && value !== null && 'id' in value) {
    const id = value.id;
    if (typeof id === 'string' || typeof id === 'number') return String(id);
  }
  return undefined;
};

/**
 * Who the request runs as and through which API, for the request span. Ids and fixed names
 * only: the user's id, the collection it is stored in (`users`), how it logged in
 * (`local-jwt` for the admin panel, `mcp-api-key`, …) and `REST`, `MCP`, `local` or `GraphQL`.
 */
const requestIdentity = (
  request: Parameters<CollectionBeforeOperationHook>[0]['req'],
): Record<string, string | undefined> => {
  const user = request.user as { id?: unknown; collection?: unknown; _strategy?: unknown } | null;
  const id = user?.id;
  return {
    'user.id': typeof id === 'string' || typeof id === 'number' ? String(id) : undefined,
    'user.collection': typeof user?.collection === 'string' ? user.collection : undefined,
    'user.auth_strategy': typeof user?._strategy === 'string' ? user._strategy : undefined,
    'payload.api': typeof request.payloadAPI === 'string' ? request.payloadAPI : undefined,
  };
};

const otelBeforeOperation: CollectionBeforeOperationHook = ({
  args,
  collection,
  operation,
  req,
}) => {
  // we ignore errors while creating the span, as this has no impact on the operation itself
  try {
    const span = getTracer().startSpan(`payload.${collection.slug}.${operation}`);
    const identity = requestIdentity(req);
    const id = documentId(args);
    const draft = (args as { draft?: unknown }).draft;
    span.setAttributes({
      'payload.collection.slug': collection.slug,
      'payload.operation': operation,
      'payload.user.id': req.user?.id ?? 'anonymous',
      'payload.transactionID': String((req.transactionID as string | number | undefined) ?? ''),
      'payload.locale': req.locale,
      ...(id === undefined ? {} : { 'payload.doc.id': id }),
      ...(typeof draft === 'boolean' ? { 'payload.draft': draft } : {}),
      ...Object.fromEntries(Object.entries(identity).filter(([, value]) => value !== undefined)),
    });

    annotateRequest(identity);
    if (!isInternalCollection(collection.slug)) {
      appendToRequest('payload.operations', `${collection.slug}.${operation}`);
      if (id !== undefined) appendToRequest('payload.documents', `${collection.slug}/${id}`);
    }

    req.context['spans'] ??= [];
    (req.context['spans'] as Span[]).push(span);
  } catch (error) {
    req.payload.logger.error({ err: error }, 'Error creating OpenTelemetry span');
  }
};

const otelAfterOperation: CollectionAfterOperationHook = ({ collection, req, result }) => {
  // Retrieve the span from the request context
  const spans = req.context['spans'] as Span[] | undefined;

  if (!spans || spans.length === 0) return result;

  const span = spans.pop();

  // a `create` learns its id only now; a `find` returns many and names none
  const id = documentId(result);
  if (id !== undefined && !isInternalCollection(collection.slug)) {
    span?.setAttribute('payload.doc.id', id);
    appendToRequest('payload.documents', `${collection.slug}/${id}`);
  }

  if (span?.isRecording() === true) {
    span.setStatus({ code: SpanStatusCode.OK });
    span.end();
  }

  return result;
};

const otelAfterError: CollectionAfterErrorHook = ({ error, req }) => {
  const spans = req.context['spans'] as Span[] | undefined;

  if (!spans || spans.length === 0) return;
  const span = spans.pop();

  if (span?.isRecording() === true) {
    // Record the exception in the trace
    span.recordException(error);
    span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
    span.end();
  }
};
/**
 * ==============================================================================================
 * asInstrumentalCollection
 * ==============================================================================================
 * This function wraps a collection configuration to add OpenTelemetry instrumentation hooks.
 *
 * @param config - The original collection configuration to be instrumented.
 * @returns A new collection configuration with OpenTelemetry hooks added.
 *
 * Usage:
 * const instrumentedCollection = asInstrumentalCollection(originalCollectionConfig);
 *
 * This will enhance the original collection with tracing capabilities for operations.
 * ==============================================================================================
 */
export const asInstrumentalCollection = (config: CollectionConfig): CollectionConfig => {
  return {
    ...config, // we keep most of the original collection configuration

    hooks: {
      // Spread any existing hooks from the original config
      ...config.hooks,

      // Add OpenTelemetry hooks, ensuring they don't overwrite existing hooks.
      beforeOperation: [otelBeforeOperation, ...(config.hooks?.beforeOperation ?? [])],
      afterOperation: [...(config.hooks?.afterOperation ?? []), otelAfterOperation],
      afterError: [...(config.hooks?.afterError ?? []), otelAfterError],
    },
  };
};
