import { ForumPostView } from '@/features/chat/components/forum/forum-post-view';
import type React from 'react';
import { Suspense } from 'react';

/**
 * A post. Every post is the same client-rendered screen, which reads the post from the URL, so
 * the service worker can replay one shell for all of them, like a chat.
 */
const ForumPostPage: React.FC = () => (
  // On a desktop the screen fills its closest positioned box, like a chat does in the chat split
  // view. Without this one it filled the viewport, under the header and the rail of tabs.
  <div className="xl:h-app-content xl:relative">
    {/* the back button reads `?from=zentrale` */}
    <Suspense>
      <ForumPostView />
    </Suspense>
  </div>
);

export default ForumPostPage;
