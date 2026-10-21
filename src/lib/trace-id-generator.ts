import type { IdGenerator } from '@opentelemetry/sdk-trace-base';

const rotl = (value: number, shift: number): number => (value << shift) | (value >>> (32 - shift));

const toHex = (word: number): string => word.toString(16).padStart(8, '0');

/**
 * Generates trace and span ids from a PRNG seeded once, when the SDK is built.
 *
 * With `cacheComponents`, Next.js 16 treats every synchronous source of randomness as I/O
 * while it prerenders a route: `Math.random()`, `crypto.getRandomValues()`, `crypto.randomUUID()`
 * and the sync functions of `node:crypto`. Next.js opens its own spans during the render
 * ("resolve segment modules", "build component tree"), and each span asks this generator for
 * an id, so any of those sources here aborts the prerender with "encountered the unstable
 * value" and logs it as an error. In production that was about 600 errors a week on
 * `/[...not-found]` and `/admin/[[...segments]]`.
 *
 * The seed is read in `register()`, outside any render, where Next.js does not check. The ids
 * only need to be unique and evenly spread for `TraceIdRatioBasedSampler`, not secret: the
 * OpenTelemetry default uses `Math.random()`. The generator is xoshiro128\*\*, with 128 bits
 * of state.
 */
export class SeededIdGenerator implements IdGenerator {
  private readonly state = new Uint32Array(4);

  constructor() {
    crypto.getRandomValues(this.state);
  }

  /** @returns a 32-character hex trace id. */
  generateTraceId(): string {
    return toHex(this.next()) + toHex(this.next()) + toHex(this.next()) + toHex(this.next());
  }

  /** @returns a 16-character hex span id. */
  generateSpanId(): string {
    return toHex(this.next()) + toHex(this.next());
  }

  private next(): number {
    const [s0 = 0, s1 = 0, s2 = 0, s3 = 0] = this.state;
    const result = Math.imul(rotl(Math.imul(s1, 5), 7), 9) >>> 0;

    const n2 = s2 ^ s0;
    const n3 = s3 ^ s1;
    this.state.set([s0 ^ n3, s1 ^ n2, n2 ^ (s1 << 9), rotl(n3, 11)]);

    return result;
  }
}
