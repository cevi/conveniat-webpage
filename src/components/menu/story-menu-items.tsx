'use client';

import type { AppFeaturesVariant } from '@/components/menu/app-feature-menu-item';
import { AppFeatureMenuItem } from '@/components/menu/app-feature-menu-item';
import { useLeaderAccess } from '@/hooks/use-leader-access';
import type { Locale, StaticTranslationString } from '@/types/types';
import { BookOpen, Swords } from 'lucide-react';
import type React from 'react';

const storyTranslation: StaticTranslationString = { de: 'Story', en: 'Story', fr: 'Histoire' };

const challengesTranslation: StaticTranslationString = {
  de: 'Challenges',
  en: 'Challenges',
  fr: 'Défis',
};

/**
 * The menu's ways to the story and the challenges, for Leitende only. The menu is rendered on
 * the server without the session, so the items ask themselves, see `useLeaderAccess`.
 */
export const StoryMenuItems: React.FC<{
  variant: AppFeaturesVariant;
  locale: Locale;
  /** whether the deployment turned the story on, `FEATURE_ENABLE_STORY` */
  enabled: boolean;
}> = ({ variant, locale, enabled }) => {
  if (!useLeaderAccess(enabled)) return <></>;
  return (
    <>
      <AppFeatureMenuItem
        variant={variant}
        href="/app/story"
        Icon={BookOpen}
        text={storyTranslation[locale]}
      />
      <AppFeatureMenuItem
        variant={variant}
        href="/app/challenges"
        Icon={Swords}
        text={challengesTranslation[locale]}
      />
    </>
  );
};
