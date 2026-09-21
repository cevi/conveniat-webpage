import { internalAuthorsField } from '@/features/payload-cms/payload-cms/shared-fields/internal-authors-field';
import type { PayloadRequest, TypedUser } from 'payload';

const user = { id: 'user-1' } as TypedUser;

const runBeforeChange = ({
  value,
  operation,
  currentUser,
}: {
  value?: unknown;
  operation: string;
  currentUser: TypedUser | null;
}): unknown => {
  const field = internalAuthorsField as {
    hooks: { beforeChange: ((argument: unknown) => unknown)[] };
  };
  const hook = field.hooks.beforeChange[0];
  if (hook === undefined) throw new Error('beforeChange hook is not registered');
  return hook({ value, operation, req: { user: currentUser } as PayloadRequest });
};

const runDefaultValue = (currentUser: TypedUser | null): unknown => {
  const { defaultValue } = internalAuthorsField as {
    defaultValue: (argument: { user: TypedUser | null }) => unknown;
  };
  return defaultValue({ user: currentUser });
};

describe('internalAuthorsField', () => {
  describe('defaultValue', () => {
    it('pre-fills the current user', () => {
      expect(runDefaultValue(user)).toStrictEqual(['user-1']);
    });

    it('stays empty when there is no authenticated user', () => {
      // eslint-disable-next-line unicorn/no-null -- Payload types an unauthenticated `user` as null
      expect(runDefaultValue(null)).toBeUndefined();
    });
  });

  describe('beforeChange', () => {
    it('sets the creating user on create', () => {
      expect(
        runBeforeChange({ value: undefined, operation: 'create', currentUser: user }),
      ).toStrictEqual(['user-1']);
    });

    it('sets the creating user when an empty list is submitted', () => {
      expect(runBeforeChange({ value: [], operation: 'create', currentUser: user })).toStrictEqual([
        'user-1',
      ]);
    });

    it('keeps explicitly chosen authors on create', () => {
      expect(
        runBeforeChange({ value: ['user-2'], operation: 'create', currentUser: user }),
      ).toStrictEqual(['user-2']);
    });

    it('keeps populated author documents on create', () => {
      const populated = [{ id: 'user-2', email: 'someone@example.org' }];
      expect(
        runBeforeChange({ value: populated, operation: 'create', currentUser: user }),
      ).toStrictEqual(populated);
    });

    it('does not touch the authors on update', () => {
      expect(
        runBeforeChange({ value: undefined, operation: 'update', currentUser: user }),
      ).toBeUndefined();
    });

    it('leaves the value untouched when there is no authenticated user', () => {
      expect(
        // eslint-disable-next-line unicorn/no-null -- Payload types an unauthenticated `req.user` as null
        runBeforeChange({ value: undefined, operation: 'create', currentUser: null }),
      ).toBeUndefined();
    });
  });
});
