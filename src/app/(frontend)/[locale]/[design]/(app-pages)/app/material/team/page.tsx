import { TeamView } from '@/features/material/components/team-view';
import type React from 'react';
import { Suspense } from 'react';

const Page: React.FC = () => (
  <Suspense>
    <TeamView />
  </Suspense>
);

export default Page;
