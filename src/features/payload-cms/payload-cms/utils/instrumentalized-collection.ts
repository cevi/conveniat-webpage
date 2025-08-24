import type { Span } from '@opentelemetry/api';
import { SpanStatusCode, trace } from '@opentelemetry/api';
import type {
  CollectionAfterErrorHook,
  CollectionAfterOperationHook,
  CollectionBeforeOperationHook,
  CollectionConfig,
} from 'payload';

const tracer = trace.getTracer('payload-cms-instrumentation');

const otelBeforeOperation: CollectionBeforeOperationHook = ({ collection, operation, req }) => {
  // we ignore errors while creating the span, as this has no impact on the operation itself
  try {
    const span: Span = tracer.startSpan(`payload.${collection.slug}.${operation}`);
    span.setAttributes({
      'payload.collection.slug': collection.slug,
      'payload.operation': operation,
      'payload.user.id': req.user?.id ?? 'anonymous',
      'payload.transactionID': String(req.transactionID),
      'payload.locale': req.locale,
    });

    req.context['spans'] = [...((req.context['spans'] as [] | undefined) ?? []), span];
  } catch (error) {
    console.error('Error creating OpenTelemetry span:', error);
  }
};

const otelAfterOperation: CollectionAfterOperationHook = ({ req, result }) => {
  // Retrieve the span from the request context
  const spans = req.context['spans'] as Span[] | undefined;
  const span = spans?.pop();
  if (span === undefined) return;

  span.setStatus({ code: SpanStatusCode.OK });
  span.end();
  return result;
};

const otelAfterError: CollectionAfterErrorHook = ({ error, req }) => {
  // Retrieve the span from the request context
  const spans = req.context['spans'] as Span[] | undefined;
  const span = spans?.pop();
  if (span === undefined) return;

  span.recordException(error);
  span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
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
