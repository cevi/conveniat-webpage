import { chatRouter } from '@/features/chat/api/chat-router';
import { createTRPCRouter } from '@/trpc/init';

export const appRouter = createTRPCRouter({
  chat: chatRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
