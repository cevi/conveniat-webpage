import { OverviewView } from '@/features/material/components/overview-view';
import type React from 'react';
import { Suspense } from 'react';

const Page: React.FC = () => (
  <Suspense>
    <OverviewView />
  </Suspense>
);

export default Page;
