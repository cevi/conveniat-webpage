import type {
  Attributes,
  BatchObservableResult,
  Counter,
  Histogram,
  Meter,
  Observable,
  UpDownCounter,
} from '@opentelemetry/api';
import { createNoopMeter, metrics, ValueType } from '@opentelemetry/api';

/**
 * The one way to define a metric in this codebase.
 *
 * Every instrument is bound to the global MeterProvider on first use, not when its module is
 * imported. The JS metrics API keeps no proxy for a provider that is not registered yet:
 * `metrics.getMeter()` called before `sdk.start()` returns a no-op meter, and an instrument
 * created from it records nothing for the life of the process. `payload.config.ts` and
 * `@/trpc/init` pull half the server in while the SDK is still starting, which is how
 * `HostMetrics` lost every series in #1659. Here a sample recorded before the provider is
 * registered is dropped and the instrument is created again on the next use, so import order
 * cannot silence a metric.
 *
 * Names are the Prometheus names the dashboards and alerts query, checked by type: a counter
 * ends in `_total`, a histogram in `_seconds` or `_bytes`, and the unit field follows from
 * that suffix. The Prometheus exporter adds `_total` to a counter and nothing else, so a name
 * in OpenTelemetry style (`chat.sse.delivery_lag` with unit `s`) would be scraped without its
 * unit and break every panel built on it.
 *
 * A histogram must name its buckets. The SDK defaults are for milliseconds (0, 5, 10, 25, …)
 * and put every request under five seconds into one bucket.
 *
 * Attribute values come from small fixed sets, never ids or error messages: every distinct
 * value is a series of its own, and past 2000 the SDK folds the rest into one overflow series.
 * Type the attributes with a union of literals where the values are known.
 */

/** A counter name as Prometheus scrapes it. */
export type CounterName = `${string}_total`;

/** A histogram name, with the unit it measures in. */
export type HistogramName = `${string}_seconds` | `${string}_bytes`;

/** Attributes for an instrument that takes none. */
export type NoAttributes = Record<never, never>;

/** The attributes argument: required when the instrument has attributes, absent when not. */
type AttributesArgument<TAttributes extends Attributes> = keyof TAttributes extends never
  ? []
  : [attributes: TAttributes];

interface MetricDefinition<TName extends string> {
  /**
   * The instrumentation scope, which Prometheus shows as `otel_scope_name`. One per area of
   * the code, like `chat-realtime` or `cevidb`.
   */
  scope: string;
  name: TName;
  description: string;
}

/** A counter that only goes up. */
export interface DefinedCounter<TAttributes extends Attributes> {
  add: (value: number, ...attributes: AttributesArgument<TAttributes>) => void;
}

/** A counter that goes up and down, like the number of open streams. */
export interface DefinedUpDownCounter<TAttributes extends Attributes> {
  add: (value: number, ...attributes: AttributesArgument<TAttributes>) => void;
}

/** A histogram of durations or sizes. */
export interface DefinedHistogram<TAttributes extends Attributes> {
  record: (value: number, ...attributes: AttributesArgument<TAttributes>) => void;
}

/** The meter the no-op provider hands out, to tell it apart from a real one. */
const NoopMeter = createNoopMeter().constructor;

/** The meter for `scope`, or `undefined` while no MeterProvider is registered. */
const resolveMeter = (scope: string): Meter | undefined => {
  const meter = metrics.getMeter(scope);
  return meter instanceof NoopMeter ? undefined : meter;
};

/** The unit of a metric, from its name. `undefined` for a plain count. */
const unitOf = (name: string): 's' | 'By' | undefined => {
  if (name.endsWith('_seconds')) return 's';
  if (name.endsWith('_bytes')) return 'By';
  return undefined;
};

/** Creates the instrument on the first use that finds a registered provider. */
const bindOnFirstUse = <TInstrument>(
  scope: string,
  create: (meter: Meter) => TInstrument,
): (() => TInstrument | undefined) => {
  let instrument: TInstrument | undefined;
  return (): TInstrument | undefined => {
    if (instrument !== undefined) return instrument;
    const meter = resolveMeter(scope);
    if (meter !== undefined) instrument = create(meter);
    return instrument;
  };
};

/**
 * Defines a counter, like `push_sends_total`.
 *
 * @param definition Its scope, name and description.
 * @returns The counter. Samples taken before the SDK started are dropped.
 */
export const defineCounter = <TAttributes extends Attributes = NoAttributes>(
  definition: MetricDefinition<CounterName>,
): DefinedCounter<TAttributes> => {
  const { scope, name, description } = definition;
  const instrument = bindOnFirstUse<Counter>(scope, (meter) =>
    meter.createCounter(name, { description, valueType: ValueType.INT }),
  );
  return {
    add: (value, ...attributes): void => instrument()?.add(value, attributes[0]),
  };
};

/**
 * Defines a counter that can go down, like `chat_sse_streams_active`.
 *
 * Unlike a counter it carries no `_total`. The exporter scrapes it as a gauge.
 *
 * @param definition Its scope, name and description.
 * @returns The counter. Samples taken before the SDK started are dropped.
 */
export const defineUpDownCounter = <TAttributes extends Attributes = NoAttributes>(
  definition: MetricDefinition<string>,
): DefinedUpDownCounter<TAttributes> => {
  const { scope, name, description } = definition;
  const instrument = bindOnFirstUse<UpDownCounter>(scope, (meter) =>
    meter.createUpDownCounter(name, { description, valueType: ValueType.INT }),
  );
  return {
    add: (value, ...attributes): void => instrument()?.add(value, attributes[0]),
  };
};

/**
 * Defines a histogram, like `trpc_procedure_duration_seconds`.
 *
 * @param definition Its scope, name, description and bucket boundaries, in the unit of its
 *   name. Choose them for what it measures: a database query and a Hof sync are minutes apart.
 * @returns The histogram. Samples taken before the SDK started are dropped.
 */
export const defineHistogram = <TAttributes extends Attributes = NoAttributes>(
  definition: MetricDefinition<HistogramName> & { buckets: readonly number[] },
): DefinedHistogram<TAttributes> => {
  const { scope, name, description, buckets } = definition;
  const unit = unitOf(name);
  const instrument = bindOnFirstUse<Histogram>(scope, (meter) =>
    meter.createHistogram(name, {
      description,
      valueType: ValueType.DOUBLE,
      ...(unit === undefined ? {} : { unit }),
      advice: { explicitBucketBoundaries: [...buckets] },
    }),
  );
  return {
    record: (value, ...attributes): void => instrument()?.record(value, attributes[0]),
  };
};

/** One gauge of a set read together, see `defineObservableGauges`. */
export interface GaugeDefinition {
  name: string;
  description: string;
  /** `int` for counts and bytes, `double` for seconds and ratios. */
  valueType: 'int' | 'double';
}

/** Hands the callback of `defineObservableGauges` a way to report one gauge. */
export type ObserveGauge<TKey extends string> = (
  gauge: TKey,
  value: number,
  attributes?: Attributes,
) => void;

interface PendingGauges {
  register: () => boolean;
}

/**
 * Gauge sets defined before the SDK started, kept on `globalThis` because Next.js compiles the
 * instrumentation hook and the app into separate bundles, each with its own copy of this
 * module. `bindPendingGauges` runs in one of them and has to reach the others.
 */
const PENDING_GAUGES_KEY = Symbol.for('conveniat27.telemetry.pending-gauges');
const pendingGauges = ((globalThis as Record<symbol, unknown>)[PENDING_GAUGES_KEY] ??=
  []) as PendingGauges[];

/**
 * Defines gauges whose values are read when Prometheus scrapes, all in one callback so that
 * they come from the same moment, like the memory numbers `rss - heap_total - external` is
 * computed from.
 *
 * Registered right away when the SDK is running, otherwise as soon as `bindPendingGauges` runs
 * after `sdk.start()`.
 *
 * @param definition The scope, the gauges by a key of your choice, and the callback that
 *   reports them. Report nothing rather than a zero when the value is unknown.
 */
export const defineObservableGauges = <TKey extends string>(definition: {
  scope: string;
  gauges: Record<TKey, GaugeDefinition>;
  observe: (observe: ObserveGauge<TKey>) => void | Promise<void>;
}): void => {
  const { scope, gauges, observe } = definition;

  const register = (): boolean => {
    const meter = resolveMeter(scope);
    if (meter === undefined) return false;

    const keys = Object.keys(gauges) as TKey[];
    const instruments = new Map<TKey, Observable>(
      keys.map((key) => {
        const { name, description, valueType } = gauges[key];
        const unit = unitOf(name);
        return [
          key,
          meter.createObservableGauge(name, {
            description,
            valueType: valueType === 'int' ? ValueType.INT : ValueType.DOUBLE,
            ...(unit === undefined ? {} : { unit }),
          }),
        ];
      }),
    );

    meter.addBatchObservableCallback(
      (result: BatchObservableResult) =>
        observe((key, value, attributes) => {
          const instrument = instruments.get(key);
          if (instrument !== undefined) result.observe(instrument, value, attributes);
        }),
      [...instruments.values()],
    );
    return true;
  };

  if (!register()) pendingGauges.push({ register });
};

/**
 * Registers the gauge sets defined before the SDK started. Call it right after `sdk.start()`.
 */
export const bindPendingGauges = (): void => {
  const waiting = pendingGauges.splice(0);
  for (const gauges of waiting) {
    if (!gauges.register()) pendingGauges.push(gauges);
  }
};
