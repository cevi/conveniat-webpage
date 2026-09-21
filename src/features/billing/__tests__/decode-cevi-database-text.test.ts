import { decodeCeviDatabaseText } from '@/features/billing/collections/decode-cevi-database-text';
import type { FieldHookArgs } from 'payload';

/** The hook only ever looks at `value`; the rest of the args are Payload's. */
const read = (args: { value?: unknown }): unknown =>
  decodeCeviDatabaseText(args as unknown as FieldHookArgs) as unknown;

describe('decodeCeviDatabaseText', () => {
  it('reads a name stored before the ingest decoded it', () => {
    expect(read({ value: 'Hauptlager conveniat27 - Altstetten &amp;amp; Albisrieden' })).toBe(
      'Hauptlager conveniat27 - Altstetten & Albisrieden',
    );
  });

  it('leaves a name that was stored decoded alone, so the sync sees no change', () => {
    const name = 'Hauptlager conveniat27 - Altstetten & Albisrieden';
    expect(read({ value: name })).toBe(name);
  });

  it('passes a missing value through instead of turning it into a string', () => {
    expect(read({})).toBeUndefined();
    // eslint-disable-next-line unicorn/no-null
    expect(read({ value: null })).toBeNull();
  });
});
