import { LocalizedPage } from '@/page-layouts/localized-page';
import React from 'react';

export const PrivacyPage: React.FC<LocalizedPage> = (properties) => {
  return (
    <>
      <span>Render Privacy Page in {properties.locale}</span>
    </>
  );
};
