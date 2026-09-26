'use client';

import type { StaticTranslationString } from '@/types/types';
import { useTranslation } from '@payloadcms/ui';
import { ExternalLink } from 'lucide-react';
import type React from 'react';

const OPEN: StaticTranslationString = { de: 'Öffnen', en: 'Open', fr: 'Ouvrir' };

/**
 * Opens a Hof file straight from a list, so a reviewer reads a plan without going through its
 * edit view. A column of its own: the first column already links to the document.
 */
export const FileLinkCell: React.FC<{ rowData?: { url?: unknown } }> = ({ rowData }) => {
  const { i18n } = useTranslation();
  // Payload also renders a Cell without a row, e.g. while it builds form state
  const url = typeof rowData?.url === 'string' ? rowData.url : undefined;
  if (url === undefined) return <></>;
  const language = i18n.language as keyof StaticTranslationString;
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1"
      onClick={(event) => event.stopPropagation()}
    >
      <ExternalLink className="h-3.5 w-3.5" aria-hidden />
      {(OPEN[language] as string | undefined) ?? OPEN.de}
    </a>
  );
};
