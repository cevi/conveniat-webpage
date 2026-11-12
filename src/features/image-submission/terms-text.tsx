import type React from 'react';

/** The full terms as the editors wrote them, a paragraph for every blank line. */
export const TermsText: React.FC<{ text: string }> = ({ text }) => (
  <div className="space-y-3 text-[15px] leading-normal text-green-700">
    {text
      .split(/\n\s*\n/)
      .filter((paragraph) => paragraph.trim() !== '')
      .map((paragraph, index) => (
        <p key={index} className="whitespace-pre-line">
          {paragraph.trim()}
        </p>
      ))}
  </div>
);
