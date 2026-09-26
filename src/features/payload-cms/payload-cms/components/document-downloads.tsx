import prisma from '@/lib/db/prisma';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { Download, User } from 'lucide-react';
import type { DefaultServerCellComponentProps, UIFieldServerProps } from 'payload';
import type React from 'react';

const downloadsLabel: StaticTranslationString = {
  en: 'Downloads',
  de: 'Downloads',
  fr: 'Téléchargements',
};

const loggedInUsersLabel: StaticTranslationString = {
  en: 'by logged-in users',
  de: 'von angemeldeten Personen',
  fr: 'par des personnes connectées',
};

const totalDescription: StaticTranslationString = {
  en: 'Every time the file was opened, including visitors who were not logged in.',
  de: 'Jedes Öffnen der Datei, auch durch nicht angemeldete Besuchende.',
  fr: 'Chaque ouverture du fichier, y compris par des visiteurs non connectés.',
};

interface DownloadStats {
  total: number;
  uniqueUsers: number;
}

const getDownloadStats = async (documentId: string): Promise<DownloadStats> => {
  const [total, users] = await Promise.all([
    prisma.documentDownload.count({ where: { documentId } }),
    prisma.documentDownload.groupBy({
      by: ['userId'],
      // eslint-disable-next-line unicorn/no-null -- Prisma matches a SQL NULL only through null
      where: { documentId, userId: { not: null } },
    }),
  ]);
  return { total, uniqueUsers: users.length };
};

const adminLocale = (language: string): Locale =>
  i18nConfig.locales.includes(language) ? (language as Locale) : 'en';

/**
 * List column with the number of downloads and of distinct logged-in users who downloaded.
 */
export const DocumentDownloadsCell = async ({
  rowData,
  i18n,
}: DefaultServerCellComponentProps): Promise<React.ReactElement> => {
  const documentId: unknown = rowData['id'];
  if (typeof documentId !== 'string') return <></>;

  const { total, uniqueUsers } = await getDownloadStats(documentId);
  const locale = adminLocale(i18n.language);

  return (
    <span
      className="inline-flex items-center gap-2 tabular-nums"
      title={`${String(total)} ${downloadsLabel[locale]}, ${String(uniqueUsers)} ${loggedInUsersLabel[locale]}`}
    >
      <span className="inline-flex items-center gap-1">
        <Download aria-hidden="true" className="size-3.5" />
        {total}
      </span>
      <span className="inline-flex items-center gap-1">
        <User aria-hidden="true" className="size-3.5" />
        {uniqueUsers}
      </span>
    </span>
  );
};

/**
 * Sidebar summary of the downloads of a document.
 */
export const DocumentDownloadsField = async ({
  id,
  i18n,
}: UIFieldServerProps): Promise<React.ReactElement> => {
  // a document that is being created has no downloads yet
  if (typeof id !== 'string') return <></>;

  const { total, uniqueUsers } = await getDownloadStats(id);
  const locale = adminLocale(i18n.language);

  return (
    <div className="mb-8 text-base">
      <div>
        <span className="font-semibold">{downloadsLabel[locale]}:</span> {total}
      </div>
      <div>
        {uniqueUsers} {loggedInUsersLabel[locale]}
      </div>
      <p className="mt-1 text-sm text-(--theme-elevation-500)">{totalDescription[locale]}</p>
    </div>
  );
};
