import { avatarTextColorOf } from '@/components/ui/person-avatar';
import { SenderAvatar } from '@/features/chat/components/chat-view/message/sender-avatar';
import { splitDisplayName } from '@/features/chat/utils/split-display-name';
import type { Typist } from '@/features/chat/utils/typing-store';
import type { Locale, StaticTranslationString } from '@/types/types';
import type React from 'react';

const typingText: StaticTranslationString = {
  de: 'schreibt…',
  en: 'is typing…',
  fr: 'écrit…',
};

/**
 * Dots in the conversation, where the typist's message will land. The bubble is sized like
 * a one-line message, so the real message takes its place without moving the list.
 */
export const TypingIndicator: React.FC<{
  typist: Typist;
  showName: boolean;
  showAvatar: boolean;
  pictureUrl?: string | undefined;
  locale: Locale;
}> = ({ typist, showName, showAvatar, pictureUrl, locale }) => (
  <div className="flex w-full items-end gap-2 pl-2" role="status">
    {showAvatar && (
      <SenderAvatar senderId={typist.userId} name={typist.name} pictureUrl={pictureUrl} />
    )}
    <div className="flex flex-col items-start">
      {showName && (
        <span className="mb-1 max-w-full truncate px-1.5 text-[13px] font-semibold">
          <span className={avatarTextColorOf(typist.userId)}>
            {splitDisplayName(typist.name).primary}
          </span>
        </span>
      )}
      {/* the box of a one-line message bubble: an invisible line of its text gives it the
          height the arriving message will have */}
      <div className="border-line relative w-16 rounded-[16px] border bg-white px-3.5 py-2">
        <div aria-hidden="true" className="invisible text-[15px] leading-[21px]">
          &nbsp;
        </div>
        <span className="sr-only">
          {typist.name} {typingText[locale]}
        </span>
        <div aria-hidden="true" className="absolute inset-0 flex items-center justify-center gap-1">
          {[0, 150, 300].map((delay) => (
            <span
              key={delay}
              className="h-2 w-2 animate-bounce rounded-full bg-green-500"
              style={{ animationDelay: `${delay}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  </div>
);
