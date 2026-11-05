import { ForumZentraleView } from '@/features/chat/components/forum/forum-zentrale-view';
import type React from 'react';
import { Suspense } from 'react';

/** The forum's Zentrale, for whoever handles posts. Client rendered, like the forum. */
const ForumZentralePage: React.FC = () => (
  <Suspense>
    <ForumZentraleView />
  </Suspense>
);

export default ForumZentralePage;
