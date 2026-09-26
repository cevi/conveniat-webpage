import { HandOutView } from '@/features/material/components/hand-out-view';
import type React from 'react';
import { Suspense } from 'react';

const Page: React.FC = () => (
  <Suspense>
    <HandOutView />
  </Suspense>
);

export default Page;
