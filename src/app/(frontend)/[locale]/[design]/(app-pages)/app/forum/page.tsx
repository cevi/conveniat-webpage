import { ForumOverview } from '@/features/chat/components/forum/forum-overview';
import type React from 'react';
import { Suspense } from 'react';

/** The forum. Client rendered from the persisted query cache, so it opens offline too. */
const ForumPage: React.FC = () => (
  <Suspense>
    <ForumOverview />
  </Suspense>
);

export default ForumPage;
