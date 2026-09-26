'use client';

import { CatalogView } from '@/features/material/components/catalog-view';
import { ItemDetailView } from '@/features/material/components/item-detail-view';
import { useSearchParams } from 'next/navigation';
import type React from 'react';

/**
 * The catalogue, or one article in full. Which of the two is decided by `?item=`, the address
 * a QR label points to, mirroring how the helper portal opens one shift.
 */
export const MaterialCatalogPage: React.FC = () => {
  const code = useSearchParams().get('item');
  if (code !== null && code !== '') return <ItemDetailView code={code} />;
  return <CatalogView />;
};
