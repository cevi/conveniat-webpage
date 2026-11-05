import { ForumComposer } from '@/features/chat/components/forum/forum-composer';
import type React from 'react';
import { Suspense } from 'react';

/** A new post; the map hands over a place through the URL. */
const NewForumPostPage: React.FC = () => (
  <Suspense>
    <ForumComposer />
  </Suspense>
);

export default NewForumPostPage;
