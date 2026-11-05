import { ForumPostView } from '@/features/chat/components/forum/forum-post-view';
import type React from 'react';

/**
 * A post. Every post is the same client-rendered screen, which reads the post from the URL, so
 * the service worker can replay one shell for all of them, like a chat.
 */
const ForumPostPage: React.FC = () => <ForumPostView />;

export default ForumPostPage;
