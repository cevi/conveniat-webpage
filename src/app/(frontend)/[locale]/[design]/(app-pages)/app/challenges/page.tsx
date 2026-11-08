import { ChallengesView } from '@/features/story/components/challenges-view';
import type React from 'react';
import { Suspense } from 'react';

const ChallengesPage: React.FC = () => (
  <Suspense>
    <ChallengesView />
  </Suspense>
);

export default ChallengesPage;
