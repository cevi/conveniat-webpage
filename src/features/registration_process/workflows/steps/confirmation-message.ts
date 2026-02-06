import type { TaskConfig } from 'payload';

export const confirmationMessageStep: TaskConfig<{
  input: { userId: string };
  output: { sent: boolean };
}> = {
  slug: 'confirmationMessage',
  inputSchema: [
    {
      name: 'userId',
      type: 'text',
      required: true,
    },
  ],
  outputSchema: [
    {
      name: 'sent',
      type: 'checkbox',
    },
  ],
  handler: async ({ input, req }) => {
    await Promise.resolve();
    req.payload.logger.info(`Sending confirmation message to user ${input.userId}...`);
    // Omit implementation for now

    return {
      output: {
        sent: true,
      },
    };
  },
};
