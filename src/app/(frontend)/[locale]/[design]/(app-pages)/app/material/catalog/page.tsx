import { MaterialCatalogPage } from '@/features/material/components/material-catalog-page';
import type React from 'react';
import { Suspense } from 'react';

const Page: React.FC = () => (
  <Suspense>
    <MaterialCatalogPage />
  </Suspense>
);

export default Page;
