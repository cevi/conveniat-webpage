import { StoryView } from '@/features/story/components/story-view';
import type React from 'react';
import { Suspense } from 'react';

const StoryPage: React.FC = () => (
  <Suspense>
    <StoryView />
  </Suspense>
);

export default StoryPage;
