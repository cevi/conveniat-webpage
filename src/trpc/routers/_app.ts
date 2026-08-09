import { adminRouter } from '@/features/admin/api/admin-router';
import { chatRouter } from '@/features/chat/api/chat-router';
import { emergencyRouter } from '@/features/emergency/api/emergency-router';
import { mapRouter } from '@/features/map/api/map-router';
import { nativePushRouter } from '@/features/native-push/api/native-push-router';
import { appContentRouter } from '@/features/payload-cms/api/app-content-router';
import { uploadRouter } from '@/features/payload-cms/api/upload-router';
import { photoContestRouter } from '@/features/photo-contest/api/photo-contest-router';
import { presenceRouter } from '@/features/presence/api/presence-router';
import { pushTrackingRouter } from '@/features/push-tracking/api/push-tracking-router';
import { registrationRouter } from '@/features/registration_process/api/registration-router';
import { scheduleRouter } from '@/features/schedule/api/schedule-router';
import { shiftsRouter } from '@/features/schedule/api/shifts-router';
import { createTRPCRouter } from '@/trpc/init';

export const appRouter = createTRPCRouter({
  appContent: appContentRouter,
  chat: chatRouter,
  emergency: emergencyRouter,
  map: mapRouter,
  presence: presenceRouter,
  schedule: scheduleRouter,
  shifts: shiftsRouter,
  admin: adminRouter,
  pushTracking: pushTrackingRouter,
  registration: registrationRouter,
  upload: uploadRouter,
  nativePush: nativePushRouter,
  photoContest: photoContestRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
