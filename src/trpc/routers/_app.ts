import { chatRouter } from '@/features/chat/api/chat-router';
import { emergencyRouter } from '@/features/emergency/api/emergency-router';
import { createTRPCRouter } from '@/trpc/init';

export const appRouter = createTRPCRouter({
  chat: chatRouter,
  emergency: emergencyRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
