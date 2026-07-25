import { ensureApprovalToken } from '@/features/payload-cms/payload-cms/plugins/form/hooks/ensure-approval-token';
import type { CollectionBeforeChangeHook } from 'payload';

describe('ensureApprovalToken hook', () => {
  it('should assign a valid UUID approvalToken when missing', () => {
    const data: Record<string, unknown> = {};
    const hookArguments = {
      data,
      collection: {},
      context: {},
      operation: 'create',
      req: {},
    } as unknown as Parameters<CollectionBeforeChangeHook>[0];

    const result = ensureApprovalToken(hookArguments) as Record<string, unknown>;

    expect(result).toHaveProperty('approvalToken');
    expect(typeof result['approvalToken']).toBe('string');
    expect(String(result['approvalToken'])).toMatch(
      /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
    );
  });

  it('should preserve existing approvalToken if already present', () => {
    const existingToken = 'test-token-12345';
    const data = { approvalToken: existingToken };
    const hookArguments = {
      data,
      collection: {},
      context: {},
      operation: 'update',
      req: {},
    } as unknown as Parameters<CollectionBeforeChangeHook>[0];

    const result = ensureApprovalToken(hookArguments) as Record<string, unknown>;

    expect(String(result['approvalToken'])).toBe(existingToken);
  });
});
