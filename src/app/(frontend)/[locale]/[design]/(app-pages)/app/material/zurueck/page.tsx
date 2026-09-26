import { TakeBackView } from '@/features/material/components/take-back-view';
import type React from 'react';
import { Suspense } from 'react';

const Page: React.FC = () => (
  <Suspense>
    <TakeBackView />
  </Suspense>
);

export default Page;
