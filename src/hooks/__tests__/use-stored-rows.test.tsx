/**
 * @jest-environment jsdom
 */
import { useStoredRows } from '@/hooks/use-stored-rows';
import type { Collection, LocalStorageCollectionUtils } from '@tanstack/db';
import { createCollection, localStorageCollectionOptions } from '@tanstack/db';
import type React from 'react';
import { act } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';

// tells React that `act` is in use here, so it neither warns nor leaves work unflushed
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

interface Row {
  id: string;
  title: string;
}

type RowCollection = Collection<Row, string | number, LocalStorageCollectionUtils, never, Row>;

const rowsStoredUnder = (storageKey: string): RowCollection =>
  createCollection(
    localStorageCollectionOptions<Row>({ id: storageKey, storageKey, getKey: (row) => row.id }),
  );

const Rows: React.FC<{ collection: RowCollection }> = ({ collection }) => (
  <ul>
    {useStoredRows(collection).map((row) => (
      <li key={row.id}>{row.title}</li>
    ))}
  </ul>
);

describe('useStoredRows', () => {
  it('hydrates what the server rendered without storage, then shows the stored rows', async () => {
    // the server cannot read the browser's storage, so it renders no rows
    const html = renderToString(<Rows collection={rowsStoredUnder('nothing-stored')} />);
    expect(html).toBe('<ul></ul>');

    // what the visit before this one left behind, loaded before the page hydrates, as another
    // part of the app has usually done by then
    const row: Row = { id: 'a', title: 'Postenlauf' };
    localStorage.setItem('rows', JSON.stringify({ 's:a': { versionKey: 'v1', data: row } }));
    const stored = rowsStoredUnder('rows');
    await stored.preload();

    const container = document.createElement('div');
    container.innerHTML = html;
    const hydrationErrors: unknown[] = [];
    await act(async () => {
      hydrateRoot(container, <Rows collection={stored} />, {
        onRecoverableError: (error) => hydrationErrors.push(error),
      });
      await Promise.resolve();
    });

    expect(hydrationErrors).toEqual([]);
    expect(container.innerHTML).toBe('<ul><li>Postenlauf</li></ul>');
  });
});
