import { HoefeView } from '@/features/material/components/holders-view';
import type React from 'react';
import { Suspense } from 'react';

const Page: React.FC = () => (
  <Suspense>
    <HoefeView />
  </Suspense>
);

export default Page;
