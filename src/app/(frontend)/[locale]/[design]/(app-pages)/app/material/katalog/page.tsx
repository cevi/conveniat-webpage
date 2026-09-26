import { CatalogPage } from '@/features/material/components/catalog-view';
import type React from 'react';
import { Suspense } from 'react';

const Page: React.FC = () => (
  <Suspense>
    <CatalogPage />
  </Suspense>
);

export default Page;
