import type { JsonArray, JsonObject } from '@/lib/prisma/runtime/client';
import type { Locale, StaticTranslationString } from '@/types/types';
import Link from 'next/link';
import type React from 'react';

const alertMessageText: StaticTranslationString = {
  de: '🚨 Notfallwarnung von',
  en: '🚨 Emergency Alert from',
  fr: "🚨 Alerte d'urgence de",
};

export const formatMessageContent = (
  text: string | number | boolean | JsonObject | JsonArray,
  locale: Locale,
): React.ReactNode[] => {
  // If the payload is a JSON object, handle special message types.
  if (
    typeof text === 'object' &&
    !Array.isArray(text) &&
    text['system_msg_type'] === 'emergency_alert'
  ) {
    const { userName, userNickname } = text;
    return [
      <div key="emergency-alert" className="rounded-md bg-red-100 p-2 font-bold text-red-600">
        {/* eslint-disable-next-line @typescript-eslint/no-base-to-string */}
        {alertMessageText[locale]} {userName?.toString() ?? userNickname?.toString() ?? ''} <br />
      </div>,
    ];
  }

  // Handle Alert Response (Help is on the way)
  if (
    typeof text === 'object' &&
    !Array.isArray(text) &&
    'message' in text &&
    'phoneNumber' in text
  ) {
    // eslint-disable-next-line @typescript-eslint/no-base-to-string
    return [text['message']?.toString() ?? ''];
  }

  // Handle Alert Question
  if (typeof text === 'object' && !Array.isArray(text) && 'question' in text && 'options' in text) {
    // eslint-disable-next-line @typescript-eslint/no-base-to-string
    return [text['question']?.toString() ?? ''];
  }

  if (typeof text === 'number' || typeof text === 'boolean') {
    return [text.toString()];
  }

  if (typeof text !== 'string') {
    return [JSON.stringify(text, undefined, 2)];
  }

  const splitFormattingAndLinkRegex = /(\*.*?\*|_.*?_|~.*?~|https?:\/\/[^\s]+)/g;
  const boldRegex = /^\*(.+)\*$/;
  const italicRegex = /^_(.+)_$/;
  const strikethroughRegex = /^~(.+)~$/;
  const urlRegex = /^(https?:\/\/\S+)$/;

  const lines = text.split('\n');

  return lines.flatMap((line, lineIndex) => {
    const parts = line.split(splitFormattingAndLinkRegex).filter(Boolean);
    const formattedParts = parts.map((part, partIndex) => {
      let match;
      match = part.match(boldRegex);
      if (match?.[1] != undefined)
        return <strong key={`${lineIndex}-${partIndex}-bold`}>{match[1]}</strong>;
      match = part.match(italicRegex);
      if (match?.[1] != undefined)
        return <em key={`${lineIndex}-${partIndex}-italic`}>{match[1]}</em>;
      match = part.match(strikethroughRegex);
      if (match?.[1] != undefined)
        return <s key={`${lineIndex}-${partIndex}-strikethrough`}>{match[1]}</s>;
      match = part.match(urlRegex);
      if (match?.[1] != undefined) {
        const url = match[1];
        return (
          <Link
            key={`${lineIndex}-${partIndex}-link`}
            href={url}
            className="underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            {url}
          </Link>
        );
      }
      return part;
    });

    if (lineIndex < lines.length - 1) {
      return [...formattedParts, <br key={`br-${lineIndex}`} />];
    }
    return formattedParts;
  });
};
