'use client';

import type { StaticTranslationString } from '@/types/types';
import { Button, useFormFields, useLocale } from '@payloadcms/ui';
import type React from 'react';

const openInAppText: StaticTranslationString = {
  de: 'Im Forum öffnen',
  en: 'Open in the forum',
  fr: 'Ouvrir dans le forum',
};

/**
 * Opens the topic in the app's forum, in a new tab: the posts are answered there, from the
 * Zentrale or the topic itself, not in the admin panel. Missing until the topic's chat exists.
 */
const OpenTopicInApp: React.FC = () => {
  const { code } = useLocale();
  const chatUuid = useFormFields(([fields]) => fields['chatUuid']?.value);
  if (typeof chatUuid !== 'string' || chatUuid === '') return <></>;
  const label = openInAppText[code as keyof StaticTranslationString];
  return (
    <Button
      buttonStyle="secondary"
      size="medium"
      el="anchor"
      url={`/app/forum?topic=${encodeURIComponent(chatUuid)}`}
      newTab
      margin={false}
    >
      {label}
    </Button>
  );
};

export default OpenTopicInApp;
