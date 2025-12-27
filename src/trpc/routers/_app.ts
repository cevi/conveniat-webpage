import { adminRouter } from '@/features/admin/api/admin-router';
import { chatRouter } from '@/features/chat/api/chat-router';
import { emergencyRouter } from '@/features/emergency/api/emergency-router';
import { scheduleRouter } from '@/features/schedule/api/schedule-router';
import { createTRPCRouter } from '@/trpc/init';

export const appRouter = createTRPCRouter({
  chat: chatRouter,
  emergency: emergencyRouter,
  schedule: scheduleRouter,
  admin: adminRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
