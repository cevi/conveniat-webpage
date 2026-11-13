import { ForumProtocolView } from '@/features/chat/components/forum/forum-protocol-view';
import type React from 'react';
import { Suspense } from 'react';

/** The protocol of a topic, for its Kernteam. Client rendered, like the forum. */
const ForumTopicProtocolPage: React.FC = () => (
  <Suspense>
    <ForumProtocolView />
  </Suspense>
);

export default ForumTopicProtocolPage;
