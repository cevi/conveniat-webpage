import { environmentVariables } from '@/config/environment-variables';
import { SYSTEM_MSG_TYPE_EMERGENCY_ALERT } from '@/lib/chat-shared';
import type { JsonArray, JsonObject } from '@/lib/prisma/runtime/client';
import type { Locale, StaticTranslationString } from '@/types/types';
import { isStaticTranslationString } from '@/utils/type-guards';
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
  if (isStaticTranslationString(text)) {
    // We know these values are strings (or undefined from Partial access), so we can use them directly.
    // Fallback order: current locale -> en -> empty string
    return [text[locale] ?? text.en ?? ''];
  }
  // If the payload is a JSON object, handle special message types.
  if (
    typeof text === 'object' &&
    !Array.isArray(text) &&
    text['system_msg_type'] === SYSTEM_MSG_TYPE_EMERGENCY_ALERT
  ) {
    const { userName, userNickname } = text;
    const userNameString = typeof userName === 'string' ? userName : '';
    const userNicknameString = typeof userNickname === 'string' ? userNickname : '';

    return [
      <div key="emergency-alert" className="rounded-md bg-red-100 p-2 font-bold text-red-600">
        {alertMessageText[locale]} {userNameString || userNicknameString} <br />
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
    const messageString = typeof text['message'] === 'string' ? text['message'] : '';
    return [messageString];
  }

  // Handle Alert Question
  if (typeof text === 'object' && !Array.isArray(text) && 'question' in text && 'options' in text) {
    const questionString = typeof text['question'] === 'string' ? text['question'] : '';
    return [questionString];
  }

  if (typeof text === 'number' || typeof text === 'boolean') {
    return [text.toString()];
  }

  // Handle nested text property (e.g. from messages with citations)
  if (
    typeof text === 'object' &&
    !Array.isArray(text) &&
    'text' in text &&
    typeof text['text'] === 'string'
  ) {
    return formatMessageContent(text['text'], locale);
  }

  if (typeof text !== 'string') {
    if (typeof text === 'object' && Object.keys(text).length === 0) {
      return [''];
    }
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
        const isInternalLink = url.startsWith(environmentVariables.NEXT_PUBLIC_APP_HOST_URL);

        let linkProperties: { href: string; target?: string; rel?: string };

        if (isInternalLink) {
          let path = url.replace(environmentVariables.NEXT_PUBLIC_APP_HOST_URL, '');
          if (!path.startsWith('/')) {
            path = `/${path}`;
          }
          linkProperties = {
            href: path,
          };
        } else {
          linkProperties = {
            href: url,
            target: '_blank',
            rel: 'noopener noreferrer',
          };
        }

        return (
          <Link key={`${lineIndex}-${partIndex}-link`} className="underline" {...linkProperties}>
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
