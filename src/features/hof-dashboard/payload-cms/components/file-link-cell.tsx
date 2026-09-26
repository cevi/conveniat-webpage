'use client';

import type React from 'react';

/**
 * A Hof file's name as a link to the file, so a reviewer opens a plan straight from the
 * submission instead of through its edit drawer.
 */
export const FileLinkCell: React.FC<{ cellData?: unknown; rowData?: { url?: unknown } }> = ({
  cellData,
  rowData,
}) => {
  const name = typeof cellData === 'string' ? cellData : '';
  // Payload also renders a Cell without a row, e.g. while it builds form state
  const url = typeof rowData?.url === 'string' ? rowData.url : undefined;
  if (url === undefined) return <span>{name}</span>;
  return (
    <a href={url} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()}>
      {name}
    </a>
  );
};
