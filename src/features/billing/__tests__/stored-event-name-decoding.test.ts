jest.mock('@/config/environment-variables', () => ({
  environmentVariables: {
    CEVIDB_GROUP_FULL_ADMIN: [541],
    CEVIDB_GROUP_WEB_CORE_TEAM: [105],
    GROUPS_WITH_API_ACCESS: [541, 105],
    BILLING_ADMIN_GROUP_ID: '900',
  },
}));

import { BillParticipantsCollection } from '@/features/billing/collections/bill-participants';
import { BillSettingsGlobal } from '@/features/billing/collections/bill-settings';
import { decodeStoredEventName } from '@/features/billing/collections/decode-stored-event-name';
import type { Field, FieldHook } from 'payload';

const ESCAPED = 'Hauptlager conveniat27 - Altstetten &amp;amp; Albisrieden';
const DECODED = 'Hauptlager conveniat27 - Altstetten & Albisrieden';

/** Runs a field hook the way Payload does on a read, with only what the hook looks at. */
const read = (hook: FieldHook, value?: unknown): unknown =>
  hook({ value } as unknown as Parameters<FieldHook>[0]);

/** The named field of a config, looked up the way Payload resolves it. */
const fieldNamed = (fields: Field[], name: string): Field | undefined =>
  fields.find((field) => 'name' in field && field.name === name);

/** The `eventName` field of a row of the "Hitobito Anlässe zum Synchronisieren" array. */
const settingsEventNameField = (): Field | undefined => {
  const tabs = BillSettingsGlobal.fields.find((field) => field.type === 'tabs');
  const allTabFields =
    tabs?.type === 'tabs' ? tabs.tabs.flatMap((tab) => ('fields' in tab ? tab.fields : [])) : [];
  const events = fieldNamed(allTabFields, 'events');
  return events?.type === 'array' ? fieldNamed(events.fields, 'eventName') : undefined;
};

describe('decodeStoredEventName', () => {
  it('unwraps a name that was stored escaped', () => {
    expect(read(decodeStoredEventName, ESCAPED)).toBe(DECODED);
  });

  it('leaves a name that is already text alone', () => {
    expect(read(decodeStoredEventName, DECODED)).toBe(DECODED);
  });

  it('passes a missing name through instead of turning it into a string', () => {
    expect(read(decodeStoredEventName)).toBeUndefined();
    // eslint-disable-next-line unicorn/no-null
    expect(read(decodeStoredEventName, null)).toBeNull();
  });
});

describe('the Anlass-Name shown in the admin', () => {
  it('is decoded on the Rechnungsverwaltung participant', () => {
    const field = fieldNamed(BillParticipantsCollection.fields, 'eventName');
    const hooks = field !== undefined && 'hooks' in field ? (field.hooks.afterRead ?? []) : [];

    expect(hooks).toHaveLength(1);
    expect(read(hooks[0] as FieldHook, ESCAPED)).toBe(DECODED);
  });

  it('is decoded on the event rows of the bill settings', () => {
    const field = settingsEventNameField();
    const hooks = field !== undefined && 'hooks' in field ? (field.hooks.afterRead ?? []) : [];

    expect(hooks).toHaveLength(1);
    expect(read(hooks[0] as FieldHook, ESCAPED)).toBe(DECODED);
  });
});
