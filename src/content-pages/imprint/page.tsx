import { LocalizedPage } from '@/content-pages/localized-page';
import React from 'react';

export const ImprintPage: React.FC<LocalizedPage> = (properties) => {
  return (
    <>
      <span>Render Imprint Page in {properties.locale}</span>
    </>
  );
};
