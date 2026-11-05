import { adminRouter } from '@/features/admin/api/admin-router';
import { chatRouter } from '@/features/chat/api/chat-router';
import { forumRouter } from '@/features/chat/api/forum/forum-router';
import { emergencyRouter } from '@/features/emergency/api/emergency-router';
import { hofDashboardRouter } from '@/features/hof-dashboard/api/hof-dashboard-router';
import { mapRouter } from '@/features/map/api/map-router';
import { materialRouter } from '@/features/material/api/material-router';
import { nativePushRouter } from '@/features/native-push/api/native-push-router';
import { appContentRouter } from '@/features/payload-cms/api/app-content-router';
import { searchRouter } from '@/features/payload-cms/api/search-router';
import { uploadRouter } from '@/features/payload-cms/api/upload-router';
import { photoContestRouter } from '@/features/photo-contest/api/photo-contest-router';
import { presenceRouter } from '@/features/presence/api/presence-router';
import { pushTrackingRouter } from '@/features/push-tracking/api/push-tracking-router';
import { scheduleRouter } from '@/features/schedule/api/schedule-router';
import { shiftsRouter } from '@/features/schedule/api/shifts-router';
import { profilePictureRouter } from '@/features/settings/api/profile-picture-router';
import { quickAccessRouter } from '@/features/settings/api/quick-access-router';
import { visitDayRouter } from '@/features/visit-day/api/visit-day-router';
import { createTRPCRouter } from '@/trpc/init';

export const appRouter = createTRPCRouter({
  appContent: appContentRouter,
  chat: chatRouter,
  forum: forumRouter,
  emergency: emergencyRouter,
  map: mapRouter,
  presence: presenceRouter,
  schedule: scheduleRouter,
  shifts: shiftsRouter,
  admin: adminRouter,
  pushTracking: pushTrackingRouter,
  upload: uploadRouter,
  nativePush: nativePushRouter,
  photoContest: photoContestRouter,
  profilePicture: profilePictureRouter,
  quickAccess: quickAccessRouter,
  material: materialRouter,
  hofDashboard: hofDashboardRouter,
  visitDay: visitDayRouter,
  search: searchRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
