import { otelLogDestination } from '@/features/payload-cms/payload-cms/utils/otel-log-destination';
import { stdSerializers } from 'pino';

/**
 * Logger configuration for Payload CMS.
 *
 * The destination tees every line to stdout and into the OpenTelemetry log
 * pipeline, which is what puts Payload's logs into Loki with trace correlation.
 */
export const customPayloadLoggerConfig = {
  destination: otelLogDestination,
  options: {
    // Pino serialises an `Error` only under `err`. Under any other key it is
    // JSON-encoded as `{}`, because message and stack are not enumerable, and
    // half of our call sites log `{ error }`.
    serializers: { error: stdSerializers.err },
  },
};
