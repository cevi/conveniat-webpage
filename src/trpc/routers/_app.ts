import { adminRouter } from '@/features/admin/api/admin-router';
import { chatRouter } from '@/features/chat/api/chat-router';
import { emergencyRouter } from '@/features/emergency/api/emergency-router';
import { mapRouter } from '@/features/map/api/map-router';
import { pushTrackingRouter } from '@/features/push-tracking/api/push-tracking-router';
import { registrationRouter } from '@/features/registration_process/api/registration-router';
import { scheduleRouter } from '@/features/schedule/api/schedule-router';
import { createTRPCRouter } from '@/trpc/init';

export const appRouter = createTRPCRouter({
  chat: chatRouter,
  emergency: emergencyRouter,
  map: mapRouter,
  schedule: scheduleRouter,
  admin: adminRouter,
  pushTracking: pushTrackingRouter,
  registration: registrationRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
