import { PeopleView } from '@/features/material/components/holders-view';
import type React from 'react';
import { Suspense } from 'react';

const Page: React.FC = () => (
  <Suspense>
    <PeopleView />
  </Suspense>
);

export default Page;
