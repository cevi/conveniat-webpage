/**
 * @jest-environment jsdom
 */

import AccordionClientContainer from '@/features/payload-cms/components/accordion/accordion-client-container';
import type { AccordionBlocks } from '@/features/payload-cms/payload-types';
import { act, fireEvent, render, screen, within } from '@testing-library/react';

// the real module pulls in the Next.js server renderer, which jsdom cannot load
jest.mock('@/utils/node-to-anchor-reference', () => ({
  replaceUmlautsAndAccents: (text: string): string => text,
}));

type Entry = NonNullable<AccordionBlocks['accordionBlocks']>[number];

const entry = (id: string, title: string): Entry => ({
  id,
  titleOrPortrait: 'title',
  title,
  valueBlocks: [],
});

const entries: Entry[] = [
  entry('avp', 'Was macht die AVP?'),
  entry('beitrag', 'Wie hoch sind die Lagerbeiträge?'),
  entry('hof', 'Was ist ein Hof?'),
  entry('anreise', 'Wie kommen wir ins Obergoms?'),
  entry('springende', 'Was sind Springende?'),
];

const categoryNames = {
  avp: 'Rollen & Höfe',
  beitrag: 'Finanzen',
  hof: 'Rollen & Höfe',
  anreise: 'Ort & Anreise',
};

const searchIndex: Record<string, string> = {};
for (const item of entries) searchIndex[item.id ?? ''] = (item.title ?? '').toLowerCase();

const renderAccordion = (names: Record<string, string> = categoryNames): void => {
  render(
    <AccordionClientContainer
      accordionBlocks={entries}
      childs={{}}
      enableSearch
      searchIndex={searchIndex}
      categoryNames={names}
      locale="de"
    />,
  );
};

const titles = (): string[] =>
  screen.getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent ?? '');

const sections = (): string[] =>
  screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent ?? '');

describe('AccordionClientContainer with categories', () => {
  it('groups the entries in the order of their first entry, the uncategorized ones last', () => {
    renderAccordion();

    expect(sections()).toEqual(['Rollen & Höfe', 'Finanzen', 'Ort & Anreise', 'Weitere']);
    expect(titles()).toEqual([
      'Was macht die AVP?',
      'Was ist ein Hof?',
      'Wie hoch sind die Lagerbeiträge?',
      'Wie kommen wir ins Obergoms?',
      'Was sind Springende?',
    ]);
  });

  it('offers one filter per category, with the number of its entries', () => {
    renderAccordion();

    const filters = within(screen.getByRole('group', { name: 'Nach Kategorie filtern' }))
      .getAllByRole('button')
      .map((button) => button.textContent);
    expect(filters).toEqual(['Alle5', 'Rollen & Höfe2', 'Finanzen1', 'Ort & Anreise1', 'Weitere1']);
    expect(screen.getByRole('button', { name: 'Alle 5' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('shows only the chosen category, and all of them again from "Alle"', () => {
    renderAccordion();

    fireEvent.click(screen.getByRole('button', { name: 'Finanzen 1' }));
    expect(sections()).toEqual(['Finanzen']);
    expect(titles()).toEqual(['Wie hoch sind die Lagerbeiträge?']);
    expect(screen.getByRole('button', { name: 'Finanzen 1' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    fireEvent.click(screen.getByRole('button', { name: 'Alle 5' }));
    expect(titles()).toHaveLength(5);
  });

  it('keeps the category headings over the search results', () => {
    jest.useFakeTimers();
    renderAccordion();

    fireEvent.change(screen.getByPlaceholderText('Suche…'), { target: { value: 'was' } });
    act(() => jest.advanceTimersByTime(200));

    expect(sections()).toEqual(['Rollen & Höfe', 'Weitere']);
    expect(titles()).toEqual(['Was macht die AVP?', 'Was ist ein Hof?', 'Was sind Springende?']);
    jest.useRealTimers();
  });

  it('looks as before when no entry has a category', () => {
    renderAccordion({});

    expect(screen.queryByRole('group', { name: 'Nach Kategorie filtern' })).toBeNull();
    expect(screen.queryAllByRole('heading', { level: 2 })).toHaveLength(0);
    expect(titles()).toHaveLength(5);
  });
});
