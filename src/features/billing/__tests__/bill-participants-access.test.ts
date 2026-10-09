jest.mock('@/config/environment-variables', () => ({
  environmentVariables: {
    CEVIDB_GROUP_FULL_ADMIN: [541],
    CEVIDB_GROUP_WEB_CORE_TEAM: [105],
    CEVIDB_GROUP_TRANSLATION_TEAM: [106],
    CEVIDB_GROUP_PROGRAM_TEAM: [107],
    BILLING_ADMIN_GROUP_ID: [900],
  },
}));

import { BillParticipantsCollection } from '@/features/billing/collections/bill-participants';
import type { Access, Field, FieldAccess, PayloadRequest } from 'payload';

const requestFor = (...groupIds: number[]): PayloadRequest =>
  ({
    user: { id: 'u1', groups: groupIds.map((id) => ({ id })) },
    context: {},
  }) as unknown as PayloadRequest;

const mayRead = (request: PayloadRequest): boolean =>
  (BillParticipantsCollection.access?.read as Access)({ req: request }) === true;

const fieldNamed = (name: string): Field | undefined =>
  BillParticipantsCollection.fields.find((field) => 'name' in field && field.name === name);

const mayReadField = (name: string, request: PayloadRequest): boolean => {
  const field = fieldNamed(name);
  const rule =
    field && 'access' in field ? (field.access.read as FieldAccess | undefined) : undefined;
  return rule === undefined ? true : rule({ req: request } as Parameters<FieldAccess>[0]) === true;
};

describe('who reads the registered participants', () => {
  it('is the billing team, and admin and web for the names the Höfe point at', () => {
    for (const groupId of [900, 541, 105]) expect(mayRead(requestFor(groupId))).toBe(true);
  });

  it('is not the translation team, the program team or a participant', () => {
    for (const groupId of [106, 107, 4242]) expect(mayRead(requestFor(groupId))).toBe(false);
  });

  it('keeps the address and the amount to the billing team, even from a full admin', () => {
    for (const field of ['email', 'street', 'invoiceAmount', 'status']) {
      expect(mayReadField(field, requestFor(541))).toBe(false);
      expect(mayReadField(field, requestFor(900))).toBe(true);
    }
    expect(mayReadField('fullName', requestFor(541))).toBe(true);
  });
});
