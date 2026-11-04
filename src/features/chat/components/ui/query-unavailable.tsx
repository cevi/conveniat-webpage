'use client';
import { Button } from '@/components/ui/buttons/button';
import { EmptyState } from '@/components/ui/empty-state';
import type { Locale, StaticTranslationString } from '@/types/types';
import { retryButtonTranslation } from '@/utils/shared-translations';
import { cn } from '@/utils/tailwindcss-override';
import { AlertCircle, RefreshCw, UserX, WifiOff } from 'lucide-react';
import type React from 'react';

const youAreOfflineText: StaticTranslationString = {
  en: 'You are offline',
  de: 'Du bist offline',
  fr: 'Tu es hors ligne',
};

const tryAgainText: StaticTranslationString = {
  en: 'Please try again.',
  de: 'Bitte versuche es nochmals.',
  fr: 'Réessaie.',
};

const noLongerMemberText: StaticTranslationString = {
  en: 'You are no longer in this chat',
  de: 'Du bist nicht mehr in diesem Chat',
  fr: 'Tu ne fais plus partie de ce chat',
};

/** Under "Du bist offline" on a chat and on its details. */
export const chatOfflineDescriptionText: StaticTranslationString = {
  en: 'You need to be online to see this chat.',
  de: 'Du musst online sein, um diesen Chat zu sehen.',
  fr: 'Tu dois être en ligne pour voir ce chat.',
};

/** When a chat or its details could not be loaded. */
export const chatErrorTitleText: StaticTranslationString = {
  en: 'The chat could not be loaded',
  de: 'Der Chat konnte nicht geladen werden',
  fr: 'Le chat n’a pas pu être chargé',
};

/**
 * What a chat screen shows instead of data it does not have: offline without a cached copy, a
 * failed load with the way to try again, or a chat the user has left.
 *
 * Offline offers no button, as the query starts again by itself once the connection is back.
 */
export const QueryUnavailable: React.FC<{
  availability: 'offline' | 'error' | 'notMember';
  /** why the screen needs a connection, under "Du bist offline" */
  offlineDescription: string;
  /** what could not be loaded */
  errorTitle: string;
  onRetry: () => void;
  /** while true the retry is under way, and the button waits for it */
  isRetrying: boolean;
  locale: Locale;
}> = ({ availability, offlineDescription, errorTitle, onRetry, isRetrying, locale }) => {
  if (availability === 'notMember') {
    return <EmptyState icon={UserX} title={noLongerMemberText[locale]} />;
  }
  if (availability === 'offline') {
    return (
      <div role="status">
        <EmptyState
          icon={WifiOff}
          title={youAreOfflineText[locale]}
          description={offlineDescription}
        />
      </div>
    );
  }
  return (
    <div role="alert">
      <EmptyState
        icon={AlertCircle}
        title={errorTitle}
        description={tryAgainText[locale]}
        action={
          <Button variant="quiet" size="touch" onClick={onRetry} disabled={isRetrying}>
            <RefreshCw className={cn(isRetrying && 'animate-spin')} aria-hidden="true" />
            {retryButtonTranslation[locale]}
          </Button>
        }
      />
    </div>
  );
};
