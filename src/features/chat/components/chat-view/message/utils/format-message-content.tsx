import Link from 'next/link';
import type React from 'react';

export const formatMessageContent = (text: string): React.ReactNode[] => {
  // Regex to split the string by WhatsApp-style formatting delimiters and also by URLs, keeping the delimiters/URLs.
  const splitFormattingAndLinkRegex = /(\*.*?\*|_.*?_|~.*?~|https?:\/\/[^\s]+)/g;

  // Regexes to identify the type of formatting in a matched part
  const boldRegex = /^\*(.+)\*$/; // Matches *content*
  const italicRegex = /^_(.+)_$/; // Matches _content_
  const strikethroughRegex = /^~(.+)~$/; // Matches ~content~
  const urlRegex = /^(https?:\/\/\S+)$/; // Matches a URL

  // Split the text by newlines first
  const lines = text.split('\n');

  return lines.flatMap((line, lineIndex) => {
    // Split the line by formatting delimiters and links
    const parts = line.split(splitFormattingAndLinkRegex).filter(Boolean);

    const formattedParts = parts.map((part, partIndex) => {
      let match;

      // Check for bold
      match = part.match(boldRegex);
      if (match?.[1] != undefined) {
        return <strong key={`${lineIndex}-${partIndex}-bold`}>{match[1]}</strong>;
      }

      // Check for italic
      match = part.match(italicRegex);
      if (match?.[1] != undefined) {
        return <em key={`${lineIndex}-${partIndex}-italic`}>{match[1]}</em>;
      }

      // Check for strikethrough
      match = part.match(strikethroughRegex);
      if (match?.[1] != undefined) {
        return <s key={`${lineIndex}-${partIndex}-strikethrough`}>{match[1]}</s>;
      }

      // Check for URL
      match = part.match(urlRegex);
      if (match?.[1] != undefined) {
        const url = match[1];
        return (
          <Link
            key={`${lineIndex}-${partIndex}-link`}
            href={url}
            className="underline"
            target="_blank" // Opens in a new tab
            rel="noopener noreferrer" // Security best practice
          >
            {url}
          </Link>
        );
      }

      // If no special formatting or link, return the part as plain text
      return part;
    });

    if (lineIndex < lines.length - 1) {
      return [...formattedParts, <br key={`br-${lineIndex}`} />];
    }
    return formattedParts;
  });
};
