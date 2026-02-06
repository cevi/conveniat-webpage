import type { TaskConfig } from 'payload';

export const resolveUserStep: TaskConfig<{
  input: { input: unknown };
  output: { reason: string; status: string; userId: string };
}> = {
  slug: 'resolveUser',
  inputSchema: [
    {
      name: 'input',
      type: 'json',
      required: true,
    },
  ],
  outputSchema: [
    {
      name: 'userId',
      type: 'text',
    },
    {
      name: 'status',
      type: 'select',
      options: [
        { label: 'Found', value: 'found' },
        { label: 'Created', value: 'created' },
        { label: 'Ambiguous', value: 'ambiguous' },
      ],
    },
    {
      name: 'reason',
      type: 'text',
    },
  ],
  handler: async ({ input, req }) => {
    await Promise.resolve();
    req.payload.logger.info(`Resolving user with input: ${JSON.stringify(input)}`);
    // Omit implementation for now as requested

    // 50% chance for manual review testing
    const isAmbiguous = Math.random() < 0.5;

    if (isAmbiguous) {
      return {
        output: {
          reason: 'Multiple matches found in database (Randomly triggered for testing).',
          status: 'ambiguous',
          userId: 'ambiguous-user-id',
        },
      };
    }

    // Simulating success for now
    return {
      output: {
        reason: 'User uniquely identified.',
        status: 'found',
        userId: 'some-user-id',
      },
    };
  },
};
