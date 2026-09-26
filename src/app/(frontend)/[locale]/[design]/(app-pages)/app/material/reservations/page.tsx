import { LoanListView } from '@/features/material/components/loan-list-view';
import type React from 'react';
import { Suspense } from 'react';

const Page: React.FC = () => (
  <Suspense>
    <LoanListView mode="reservations" />
  </Suspense>
);

export default Page;
