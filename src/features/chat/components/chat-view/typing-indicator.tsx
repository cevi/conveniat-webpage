import { SenderAvatar } from '@/features/chat/components/chat-view/message/sender-avatar';
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
        <span className="mb-1 px-1.5 text-xs font-semibold text-gray-500">{typist.name}</span>
      )}
      {/* same box model as a one-line message bubble: an invisible text line and meta row
          give it the height the arriving message will have */}
      <div className="font-body relative min-w-[100px] rounded-2xl rounded-bl-[4px] border border-gray-100 bg-white px-4 py-2.5 shadow-sm">
        <div aria-hidden="true" className="invisible">
          <div className="text-[0.95rem] leading-relaxed">&nbsp;</div>
          <div className="mt-1 text-[10px]">&nbsp;</div>
        </div>
        <span className="sr-only">
          {typist.name} {typingText[locale]}
        </span>
        <div aria-hidden="true" className="absolute inset-0 flex items-center justify-center gap-1">
          {[0, 150, 300].map((delay) => (
            <span
              key={delay}
              className="h-2 w-2 animate-bounce rounded-full bg-gray-400"
              style={{ animationDelay: `${delay}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  </div>
);
