'use client';

import { useState } from 'react';

/** The column a table is sorted by, and which way. */
export interface TableSort<Key extends string> {
  key: Key;
  direction: 'ascending' | 'descending';
}

/**
 * How a table is sorted: a click on a column sorts ascending, the next descending, the third
 * returns to the table's own order, so that order is never lost.
 */
export const useTableSort = <Key extends string>(): {
  sort: TableSort<Key> | undefined;
  toggle: (key: Key) => void;
} => {
  const [sort, setSort] = useState<TableSort<Key>>();
  const toggle = (key: Key): void =>
    setSort((current) => {
      if (current?.key !== key) return { key, direction: 'ascending' };
      return current.direction === 'ascending' ? { key, direction: 'descending' } : undefined;
    });
  return { sort, toggle };
};

/**
 * The rows in the given sort, or as they came. Numbers by size, text as the reader's language
 * orders it; rows that tie keep their order.
 */
export const sortRows = <Row, Key extends string>(
  rows: readonly Row[],
  sort: TableSort<Key> | undefined,
  valueOf: (row: Row, key: Key) => number | string,
  locale: string,
): Row[] => {
  if (sort === undefined) return [...rows];
  const sign = sort.direction === 'ascending' ? 1 : -1;
  return rows.toSorted((a, b) => {
    const left = valueOf(a, sort.key);
    const right = valueOf(b, sort.key);
    const order =
      typeof left === 'number' && typeof right === 'number'
        ? left - right
        : String(left).localeCompare(String(right), locale);
    return sign * order;
  });
};
