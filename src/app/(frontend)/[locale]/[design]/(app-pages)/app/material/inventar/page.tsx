import { InventoryPage } from '@/features/material/components/inventory-view';
import type React from 'react';
import { Suspense } from 'react';

const Page: React.FC = () => (
  <Suspense>
    <InventoryPage />
  </Suspense>
);

export default Page;
