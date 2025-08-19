import { TRPCError } from '@trpc/server';

export const checkForDuplicateMembers = (
  members: {
    userId: string;
  }[],
): void => {
  const memberUuids = members.map((member) => member.userId);
  const uniqueMemberUuids = new Set(memberUuids);
  if (uniqueMemberUuids.size !== memberUuids.length) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Duplicate members are not allowed in the chat.',
    });
  }
};
