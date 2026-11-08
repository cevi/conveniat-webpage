'use client';

import { Button } from '@/components/ui/buttons/button';
import { startCall } from '@/features/chat/calls/call-engine';
import { callButtonText } from '@/features/chat/calls/call-texts';
import { useCallState, useCanMakeCalls } from '@/features/chat/calls/hooks/use-call-state';
import { useCurrentLocale } from '@/hooks/use-current-locale';
import { useOnlineStatus } from '@/hooks/use-online-status';
import type { Locale } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { Phone } from 'lucide-react';
import type React from 'react';

/** Calls the partner of a one-to-one chat; absent where calls are off or not supported. */
export const CallButton: React.FC<{
  chatId: string;
  partnerName: string;
  partnerId?: string | undefined;
}> = ({ chatId, partnerName, partnerId }) => {
  const locale = useCurrentLocale(i18nConfig) as Locale;
  const canMakeCalls = useCanMakeCalls();
  const isOnline = useOnlineStatus();
  const call = useCallState();

  if (!canMakeCalls) return <></>;

  return (
    <Button
      variant="plain"
      size="touchIcon"
      aria-label={callButtonText[locale].replace('{name}', partnerName)}
      disabled={!isOnline || (call.phase !== 'idle' && call.phase !== 'ended')}
      onClick={() => void startCall(chatId, partnerName, partnerId)}
    >
      <Phone aria-hidden="true" />
    </Button>
  );
};
