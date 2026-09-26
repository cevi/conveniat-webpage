import { ScanView } from '@/features/material/components/scan-view';
import type React from 'react';
import { Suspense } from 'react';

const Page: React.FC = () => (
  <Suspense>
    <ScanView />
  </Suspense>
);

export default Page;
