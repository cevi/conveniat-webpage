import type { TracerProvider } from '@opentelemetry/api';
import { trace } from '@opentelemetry/api';

/** The part of an OpenTelemetry instrumentation this needs; every `InstrumentationBase` has it. */
interface Instrumentation {
  readonly instrumentationName: string;
  setTracerProvider(provider: TracerProvider): void;
  enable(): void;
  disable(): void;
}

/** The name `@prisma/instrumentation` registers under. */
const PRISMA_INSTRUMENTATION_NAME = '@prisma/instrumentation';

/**
 * Hands the instrumentations the tracer provider the SDK registered. Call after `sdk.start()`.
 *
 * In the Next.js server the instrumentations ended up with a provider that records nothing,
 * read on 2026-11-06 from the running dev server: Mongoose was patched and Prisma's helper was
 * enabled, yet neither produced a single span. The process holds more than one copy of
 * `@opentelemetry/api` (its own, the one Next.js ships in `next/dist/compiled`, and what the
 * bundle carries), and the instrumentations took their provider before the SDK registered its
 * own, from a copy whose proxy never receives it. The registered provider, read here once it
 * exists, is the same for every copy.
 *
 * Prisma's instrumentation does not patch a module: `enable()` builds the helper the Prisma
 * client asks on every query, with the provider it has at that moment. So it is enabled again
 * after taking the new one.
 *
 * @param instrumentations - the instrumentations passed to the SDK
 * @param provider - the registered provider; the default reads it from the global API
 */
export function bindInstrumentationsToProvider(
  instrumentations: readonly Instrumentation[],
  provider: TracerProvider = trace.getTracerProvider(),
): void {
  for (const instrumentation of instrumentations) {
    instrumentation.setTracerProvider(provider);
    if (instrumentation.instrumentationName === PRISMA_INSTRUMENTATION_NAME) {
      instrumentation.disable();
      instrumentation.enable();
    }
  }
}
