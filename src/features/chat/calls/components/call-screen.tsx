'use client';

import { Button } from '@/components/ui/buttons/button';
import { PersonAvatar } from '@/components/ui/person-avatar';
import {
  acceptCall,
  declineCall,
  dismissEndedCall,
  hangUp,
  toggleMute,
  type CallState,
} from '@/features/chat/calls/call-engine';
import {
  acceptText,
  callDialogLabel,
  callingText,
  closeText,
  connectingText,
  declineText,
  endReasonTexts,
  hangUpText,
  incomingText,
  muteText,
  reconnectingText,
} from '@/features/chat/calls/call-texts';
import { useCallSignals } from '@/features/chat/calls/hooks/use-call-signals';
import { useCallDuration, useCallState } from '@/features/chat/calls/hooks/use-call-state';
import { useCurrentLocale } from '@/hooks/use-current-locale';
import { chatErrorTexts } from '@/lib/chat-error-texts';
import type { Locale } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { userErrorMessage } from '@/utils/user-error-message';
import { Mic, MicOff, Phone, PhoneOff } from 'lucide-react';
import type React from 'react';
import { createPortal } from 'react-dom';

const roundButtonClassName = 'h-16 w-16 rounded-full [&_svg]:size-7';

/** The line under the partner's name: what the call is doing right now. */
const useStatusLine = (call: CallState, locale: Locale): string => {
  const duration = useCallDuration(call.connectedAt);
  if (call.reconnecting) return reconnectingText[locale];
  switch (call.phase) {
    case 'outgoing': {
      return callingText[locale];
    }
    case 'incoming': {
      return incomingText[locale];
    }
    case 'connecting': {
      return connectingText[locale];
    }
    case 'active': {
      return duration;
    }
    case 'ended': {
      if (call.endReason === 'error') return userErrorMessage(call.error, locale, chatErrorTexts);
      return call.endReason === undefined ? '' : endReasonTexts[call.endReason][locale];
    }
    case 'idle': {
      return '';
    }
  }
};

const LabelledButton: React.FC<{
  label: string;
  children: React.ReactNode;
}> = ({ label, children }) => (
  <div className="flex flex-col items-center gap-2">
    {children}
    <span aria-hidden="true" className="text-[13px] font-semibold text-green-700">
      {label}
    </span>
  </div>
);

/**
 * The call, over the whole screen while it rings or runs: who it is with, what it is doing,
 * and the buttons to take, decline, mute or end it.
 */
const CallScreenView: React.FC<{ call: CallState }> = ({ call }) => {
  const locale = useCurrentLocale(i18nConfig) as Locale;
  const statusLine = useStatusLine(call, locale);
  const partnerName = call.partnerName ?? '';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${callDialogLabel[locale]}: ${partnerName}`}
      className="bg-page fixed inset-0 z-[1000] flex flex-col items-center justify-between px-4 pt-[calc(var(--app-top-inset,0px)+72px)] pb-[calc(env(safe-area-inset-bottom)+48px)]"
    >
      <div className="flex flex-col items-center gap-4 text-center">
        <PersonAvatar
          seed={call.partnerId ?? partnerName}
          name={partnerName}
          className="h-28 w-28 text-4xl"
        />
        <h1 className="font-heading text-heading text-[28px] leading-tight font-extrabold">
          {partnerName}
        </h1>
        <p
          aria-live="polite"
          className={cn(
            'min-h-[22px] text-[15px] text-green-700 tabular-nums',
            call.reconnecting && 'text-live',
          )}
        >
          {statusLine}
        </p>
      </div>

      {call.phase === 'incoming' && (
        <div className="flex w-full max-w-xs justify-between">
          <LabelledButton label={declineText[locale]}>
            <Button
              variant="danger"
              className={roundButtonClassName}
              aria-label={declineText[locale]}
              onClick={declineCall}
            >
              <PhoneOff aria-hidden="true" />
            </Button>
          </LabelledButton>
          <LabelledButton label={acceptText[locale]}>
            <Button
              variant="primary"
              className={roundButtonClassName}
              aria-label={acceptText[locale]}
              onClick={() => void acceptCall()}
            >
              <Phone aria-hidden="true" />
            </Button>
          </LabelledButton>
        </div>
      )}

      {(call.phase === 'outgoing' || call.phase === 'connecting' || call.phase === 'active') && (
        <div className="flex w-full max-w-xs justify-between">
          <LabelledButton label={muteText[locale]}>
            <Button
              variant={call.muted ? 'primary' : 'quiet'}
              className={roundButtonClassName}
              aria-label={muteText[locale]}
              aria-pressed={call.muted}
              onClick={toggleMute}
            >
              {call.muted ? <MicOff aria-hidden="true" /> : <Mic aria-hidden="true" />}
            </Button>
          </LabelledButton>
          <LabelledButton label={hangUpText[locale]}>
            <Button
              variant="danger"
              className={roundButtonClassName}
              aria-label={hangUpText[locale]}
              onClick={hangUp}
            >
              <PhoneOff aria-hidden="true" />
            </Button>
          </LabelledButton>
        </div>
      )}

      {call.phase === 'ended' && (
        <Button variant="quiet" size="touch" onClick={dismissEndedCall}>
          {closeText[locale]}
        </Button>
      )}
    </div>
  );
};

/**
 * Listens for calls and shows the call screen while there is one. Mounted once per page; the
 * screen goes to the body, above the app's header, whose stacking context would cover it.
 */
export const CallScreen: React.FC = () => {
  useCallSignals();
  const call = useCallState();
  if (call.phase === 'idle') return <></>;
  return createPortal(<CallScreenView call={call} />, document.body);
};
