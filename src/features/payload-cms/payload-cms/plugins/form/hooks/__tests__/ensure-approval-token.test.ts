import { ensureApprovalToken } from '@/features/payload-cms/payload-cms/plugins/form/hooks/ensure-approval-token';
import type { CollectionBeforeChangeHook } from 'payload';

type HookArguments = Parameters<CollectionBeforeChangeHook>[0];

const run = (
  operation: 'create' | 'update',
  data: Record<string, unknown>,
  originalDocument?: Record<string, unknown>,
): Record<string, unknown> =>
  ensureApprovalToken({
    data,
    originalDoc: originalDocument,
    operation,
  } as unknown as HookArguments) as Record<string, unknown>;

describe('ensureApprovalToken', () => {
  it('gives a new submission its own token, not one the sender chose', () => {
    const result = run('create', { approvalToken: 'chosen-by-sender' });
    expect(result['approvalToken']).not.toBe('chosen-by-sender');
    expect(result['approvalToken']).toMatch(/^[\da-f-]{36}$/);
  });

  it('keeps the token of a submission on update', () => {
    expect(run('update', {}, { approvalToken: 'stored' })['approvalToken']).toBe('stored');
  });

  it('keeps a token set on update, as the approval mail does for an old submission', () => {
    expect(run('update', { approvalToken: 'for-the-mail' }, {})['approvalToken']).toBe(
      'for-the-mail',
    );
  });
});
